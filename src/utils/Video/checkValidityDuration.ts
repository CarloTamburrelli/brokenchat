import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { VIDEO_MAX_DURATION_SECONDS } from '../consts';

const ffmpeg = new FFmpeg();

export async function checkValidityDuration(file: File) {
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }

  // scriviamo il file in FS virtuale
  await ffmpeg.writeFile('input.mp4', await fetchFile(file));

  // raccogliamo i log da ffmpeg
  let logs = '';
  const logListener = ({ message }: { message: string }) => {
    logs += message + '\n';
  };
  ffmpeg.on('log', logListener);

  // eseguiamo solo ffprobe per i metadati
  await ffmpeg.exec([
    '-i', 'input.mp4'
  ]);

  ffmpeg.off('log', logListener);

  const match = logs.match(/Duration:\s(\d+):(\d+):(\d+\.\d+)/);

  if (!match) return null;

  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3]);

  if ((hours * 3600 + minutes * 60 + seconds) <= VIDEO_MAX_DURATION_SECONDS) {
    return true;
  } else {
    return false;
  }
}