export async function downloadTelegramFile(botToken: string, filePath: string): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file from Telegram: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
