import fetch from 'node-fetch';

export async function handler(event, context) {
  const { filename, data } = JSON.parse(event.body);

  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': process.env.DROPBOX_TOKEN,
      'Dropbox-API-Arg': JSON.stringify({
        path: `/${filename}`,
        mode: 'overwrite',
        autorename: true,
        mute: false
      }),
      'Content-Type': 'application/octet-stream'
    },
    body: Buffer.from(data, 'base64')
  });

  if (!res.ok) return { statusCode: 500, body: 'Upload failed' };
  return { statusCode: 200, body: JSON.stringify({ message: 'Uploaded!' }) };
}
