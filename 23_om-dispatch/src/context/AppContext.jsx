import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { DEFAULT_MEMBERS } from '../data/members';
import { DEFAULT_JOB_TYPES } from '../data/jobTypes';
import { DEFAULT_CONDITIONS } from '../data/conditions';
import { APP_DEFAULTS } from '../data/defaults';
import { isFirestoreEnabled, saveDoc, loadDoc, subscribeDoc } from '../services/firestoreService';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  members: 'om-dispatch-members',
  jobTypes: 'om-dispatch-job-types',
  conditions: 'om-dispatch-conditions',
  jobs: 'om-dispatch-jobs',
  assignments: 'om-dispatch-assignments',
  feedbacks: 'om-dispatch-feedbacks',
  settings: 'om-dispatch-settings',
};

const FIRESTORE_DOC_ID = 'appState';

function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

const initialState = {
  members: loadFromStorage(STORAGE_KEYS.members, DEFAULT_MEMBERS),
  jobTypes: loadFromStorage(STORAGE_KEYS.jobTypes, DEFAULT_JOB_TYPES),
  conditions: loadFromStorage(STORAGE_KEYS.conditions, DEFAULT_CONDITIONS),
  jobs: loadFromStorage(STORAGE_KEYS.jobs, []),
  assignments: loadFromStorage(STORAGE_KEYS.assignments, []),
  feedbacks: loadFromStorage(STORAGE_KEYS.feedbacks, []),
  settings: loadFromStorage(STORAGE_KEYS.settings, APP_DEFAULTS),
};

function appReducer(state, action) {
  switch (action.type) {
    // Members
    case 'SET_MEMBERS':
      return { ...state, members: action.payload };
    case 'UPDATE_MEMBER': {
      const members = state.members.map(m =>
        m.id === action.payload.id ? { ...m, ...action.payload } : m
      );
      return { ...state, members };
    }

    // Job Types
    case 'SET_JOB_TYPES':
      return { ...state, jobTypes: action.payload };
    case 'ADD_JOB_TYPE':
      return { ...state, jobTypes: [...state.jobTypes, action.payload] };
    case 'UPDATE_JOB_TYPE': {
      const jobTypes = state.jobTypes.map(jt =>
        jt.id === action.payload.id ? { ...jt, ...action.payload } : jt
      );
      return { ...state, jobTypes };
    }
    case 'DELETE_JOB_TYPE':
      return { ...state, jobTypes: state.jobTypes.filter(jt => jt.id !== action.payload) };

    // Conditions
    case 'SET_CONDITIONS':
      return { ...state, conditions: action.payload };
    case 'ADD_CONDITION':
      return { ...state, conditions: [...state.conditions, action.payload] };
    case 'UPDATE_CONDITION': {
      const conditions = state.conditions.map(c =>
        c.id === action.payload.id ? { ...c, ...action.payload } : c
      );
      return { ...state, conditions };
    }
    case 'DELETE_CONDITION':
      return { ...state, conditions: state.conditions.filter(c => c.id !== action.payload) };

    // Jobs
    case 'ADD_JOB':
      return { ...state, jobs: [...state.jobs, action.payload] };
    case 'UPDATE_JOB': {
      const jobs = state.jobs.map(j =>
        j.id === action.payload.id ? { ...j, ...action.payload } : j
      );
      return { ...state, jobs };
    }
    case 'DELETE_JOB':
      return { ...state, jobs: state.jobs.filter(j => j.id !== action.payload) };

    // Assignments
    case 'ADD_ASSIGNMENT':
      return { ...state, assignments: [...state.assignments, action.payload] };
    case 'UPDATE_ASSIGNMENT': {
      const assignments = state.assignments.map(a =>
        a.id === action.payload.id ? { ...a, ...action.payload } : a
      );
      return { ...state, assignments };
    }

    // Feedbacks
    case 'ADD_FEEDBACK':
      return { ...state, feedbacks: [...state.feedbacks, action.payload] };

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    // Import/Reset
    case 'IMPORT_DATA':
      return { ...state, ...action.payload };
    case 'RESET':
      return {
        members: DEFAULT_MEMBERS,
        jobTypes: DEFAULT_JOB_TYPES,
        conditions: DEFAULT_CONDITIONS,
        jobs: [],
        assignments: [],
        feedbacks: [],
        settings: APP_DEFAULTS,
      };

    // Firestore sync
    case 'SYNC_FROM_REMOTE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isRemoteUpdate = useRef(false);
  const initialLoad = useRef(true);

  // On mount: load from Firestore if available
  useEffect(() => {
    if (!isFirestoreEnabled()) return;

    loadDoc(FIRESTORE_DOC_ID).then((data) => {
      if (data) {
        const { updatedAt, ...appData } = data;
        isRemoteUpdate.current = true;
        dispatch({ type: 'SYNC_FROM_REMOTE', payload: appData });
      }
      initialLoad.current = false;
    });
  }, []);

  // Subscribe to real-time Firestore updates
  useEffect(() => {
    if (!isFirestoreEnabled()) return;

    const unsub = subscribeDoc(FIRESTORE_DOC_ID, (data) => {
      if (initialLoad.current) return;
      const { updatedAt, ...appData } = data;
      isRemoteUpdate.current = true;
      dispatch({ type: 'SYNC_FROM_REMOTE', payload: appData });
    });

    return unsub;
  }, []);

  // Persist to localStorage + Firestore on state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.members, state.members);
    saveToStorage(STORAGE_KEYS.jobTypes, state.jobTypes);
    saveToStorage(STORAGE_KEYS.conditions, state.conditions);
    saveToStorage(STORAGE_KEYS.jobs, state.jobs);
    saveToStorage(STORAGE_KEYS.assignments, state.assignments);
    saveToStorage(STORAGE_KEYS.feedbacks, state.feedbacks);
    saveToStorage(STORAGE_KEYS.settings, state.settings);

    // Save to Firestore (skip if this was triggered by a remote update)
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    if (isFirestoreEnabled()) {
      saveDoc(FIRESTORE_DOC_ID, {
        members: state.members,
        jobTypes: state.jobTypes,
        conditions: state.conditions,
        jobs: state.jobs,
        assignments: state.assignments,
        feedbacks: state.feedbacks,
        settings: state.settings,
      });
    }
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
