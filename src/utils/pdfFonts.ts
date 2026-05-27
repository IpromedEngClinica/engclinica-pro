import jsPDF from "jspdf";

import MontserratMedium from "@/assets/fonts/Montserrat-Medium.ttf?url";
import MontserratSemiBold from "@/assets/fonts/Montserrat-SemiBold.ttf?url";
import MontserratBold from "@/assets/fonts/Montserrat-Bold.ttf?url";
import MontserratExtraBold from "@/assets/fonts/Montserrat-ExtraBold.ttf?url";

const fontCache = new Map<string, string>();

const fileToBase64 = async (url: string) => {
  const cached = fontCache.get(url);

  if (cached) return cached;

  const response = await fetch(url);
  const blob = await response.blob();

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  fontCache.set(url, base64);

  return base64;
};

export const registerMontserrat = async (doc: jsPDF) => {
  const medium = await fileToBase64(MontserratMedium);
  const semiBold = await fileToBase64(MontserratSemiBold);
  const bold = await fileToBase64(MontserratBold);
  const extraBold = await fileToBase64(MontserratExtraBold);

  // Map "normal" to Medium so PDF body text is not thin in jsPDF.
  doc.addFileToVFS("Montserrat-Medium.ttf", medium);
  doc.addFont("Montserrat-Medium.ttf", "Montserrat", "normal");

  doc.addFileToVFS("Montserrat-SemiBold.ttf", semiBold);
  doc.addFont("Montserrat-SemiBold.ttf", "Montserrat", "semibold");

  doc.addFileToVFS("Montserrat-Bold.ttf", bold);
  doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold");

  doc.addFileToVFS("Montserrat-ExtraBold.ttf", extraBold);
  doc.addFont("Montserrat-ExtraBold.ttf", "Montserrat", "extrabold");

  doc.setFont("Montserrat", "normal");
};
