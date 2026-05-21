import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(String(process.env.EMAIL_SECRET_KEY)) 
  .digest("base64")
  .substr(0, 32); 
const IV_LENGTH = 16;

export const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decrypt = (text) => {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
};

export const decryptOrFallback = (text) => {
  const value = String(text ?? "");
  if (!value) return "";

  try {
    if (!value.includes(":")) return value;
    const [ivHex = "", encryptedHex = ""] = value.split(":", 2);
    const ivLooksValid = ivHex.length === IV_LENGTH * 2 && /^[0-9a-f]+$/i.test(ivHex);
    const encryptedLooksValid = encryptedHex.length > 0 && /^[0-9a-f]+$/i.test(encryptedHex);
    if (!ivLooksValid || !encryptedLooksValid) return value;
    return decrypt(value);
  } catch {
    return value;
  }
};