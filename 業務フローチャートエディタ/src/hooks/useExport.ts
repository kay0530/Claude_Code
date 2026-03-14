import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useCallback } from "react";

/**
 * Hook providing PNG and PDF export functionality for the flowchart canvas.
 * Targets the .react-flow element for capture.
 */
export function useExport() {
  const exportToPng = useCallback(async () => {
    const element = document.querySelector(".react-flow") as HTMLElement;
    if (!element) {
      console.warn("Export: .react-flow element not found");
      return;
    }

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        quality: 1,
      });

      const link = document.createElement("a");
      link.download = "flowchart.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export PNG:", err);
    }
  }, []);

  const exportToPdf = useCallback(async () => {
    const element = document.querySelector(".react-flow") as HTMLElement;
    if (!element) {
      console.warn("Export: .react-flow element not found");
      return;
    }

    try {
      const dataUrl = await toPng(element, { backgroundColor: "#ffffff" });
      const pdf = new jsPDF("landscape", "mm", "a3");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("flowchart.pdf");
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  }, []);

  return { exportToPng, exportToPdf };
}
