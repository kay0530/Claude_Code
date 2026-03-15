import { useEffect, useRef, useCallback } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useFlowchartStore } from "../store/useFlowchartStore";
import type { FlowchartProject } from "../types/flowchart";

const DEBOUNCE_MS = 500;
const COLLECTION = "projects";

/**
 * Syncs the current flowchart project to/from Firestore in real-time.
 * Uses the project.id as the Firestore document ID.
 */
export function useFirestoreSync() {
  const project = useFlowchartStore((s) => s.project);
  const setProject = useFlowchartStore((s) => s.setProject);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);
  const lastSyncedJson = useRef<string>("");

  // Save project to Firestore (debounced)
  const saveToFirestore = useCallback(
    (proj: FlowchartProject) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(async () => {
        try {
          const json = JSON.stringify(proj);
          if (json === lastSyncedJson.current) return;
          lastSyncedJson.current = json;
          const docRef = doc(db, COLLECTION, proj.id);
          await setDoc(docRef, { data: json, updatedAt: Date.now() });
        } catch (err) {
          console.error("Firestore save failed:", err);
        }
      }, DEBOUNCE_MS);
    },
    [],
  );

  // Subscribe to Firestore changes (real-time)
  useEffect(() => {
    const docRef = doc(db, COLLECTION, project.id);

    // Ensure document exists
    getDoc(docRef).then((snap) => {
      if (!snap.exists()) {
        const json = JSON.stringify(project);
        lastSyncedJson.current = json;
        setDoc(docRef, { data: json, updatedAt: Date.now() }).catch(
          console.error,
        );
      }
    });

    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const remoteJson = snap.data().data as string;
      if (remoteJson === lastSyncedJson.current) return;

      try {
        const remoteParsed = JSON.parse(remoteJson) as FlowchartProject;
        lastSyncedJson.current = remoteJson;
        isRemoteUpdate.current = true;
        setProject(remoteParsed);
      } catch (err) {
        console.error("Failed to parse remote project:", err);
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // Only re-subscribe when project ID changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // Push local changes to Firestore
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    saveToFirestore(project);
  }, [project, saveToFirestore]);
}
