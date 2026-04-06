// Generates a 24-char hex ID matching TickTick's web app format (MongoDB ObjectID)
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  let random = '';
  for (let i = 0; i < 16; i++) random += Math.floor(Math.random() * 16).toString(16);
  return timestamp + random;
}
