import os
from typing import Dict
import redis
import json
import tempfile
import requests
from nudenet import NudeDetector
from unsafe_labels import UNSAFE_LABELS

REDIS_HOST = os.getenv('REDIS_HOST', 'redis')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
NODE_BACKEND_URL = os.getenv('NODE_BACKEND_URL', 'http://localhost:5002')
MODERATION_SECRET = os.getenv('MODERATION_SECRET')

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0)

detector = NudeDetector()


def is_unsafe(results) -> bool:
    # se è un dict singolo (immagine), lo mettiamo in lista
    if isinstance(results, dict):
        results = [results]

    # ora results è sempre una lista
    for item in results:
        # item può essere un dict singolo o lista di dict (per detect_batch)
        if isinstance(item, dict):
            label = item.get("class")
            score = item.get("score", 0)
            if label in UNSAFE_LABELS and score >= UNSAFE_LABELS[label]:
                return True
        elif isinstance(item, list):
            # batch frame video: lista di dict
            for frame_res in item:
                label = frame_res.get("class")
                score = frame_res.get("score", 0)
                if label in UNSAFE_LABELS and score >= UNSAFE_LABELS[label]:
                    return True
    return False


def send_violation(job_data: Dict, results: Dict):
    payload = {
        "job_data": job_data,
        "violations": results
    }

    resp = requests.post(
        f"{NODE_BACKEND_URL}/moderation/remove_message",
        headers={
            "Authorization": f"Bearer {MODERATION_SECRET}",
            "Content-Type": "application/json"
        },
        json=payload
    )

    if (resp.status_code != 200):
        resp.raise_for_status()


def process_image(job_data):
    resp = requests.get(job_data['url_media'], stream=True)
    resp.raise_for_status()

    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        for chunk in resp.iter_content(chunk_size=8192):
            tmp.write(chunk)
        tmp.flush()
        results = detector.detect(tmp.name)
    return results

def process_video(job_data):
    import os
    import cv2

    video_url, _ = job_data['url_media'].split("####")

    with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_video:
        resp = requests.get(video_url, stream=True)
        resp.raise_for_status()
        for chunk in resp.iter_content(chunk_size=8192):
            tmp_video.write(chunk)
        tmp_video.flush()

        cap = cv2.VideoCapture(tmp_video.name)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        step = max(frame_count // 5, 1)  # prendi 5 frame distribuiti
        frames_files = []

        for i in range(0, frame_count, step):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                continue

            tmp_frame = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
            cv2.imwrite(tmp_frame.name, frame)
            frames_files.append(tmp_frame.name)
            tmp_frame.close()

        cap.release()

        results = detector.detect_batch(frames_files)

        # pulizia file temporanei
        for f in frames_files:
            try:
                os.remove(f)
            except:
                pass

    return results



def process_job(job_data: Dict):

    try:
        if job_data['type'] == 'image':
            results = process_image(job_data)
        elif job_data['type'] == 'video':
            results = process_video(job_data)
        else:
            print(f"Tipo non gestito: {job_data['type']}")
            return

        if is_unsafe(results):
            print("Contenuto hot trovato...")
            print(results)
            send_violation(job_data, results)
        else:
            # se è un video, procedi con l'ottimizzazione.
        
            print(f"Message {job_data['message_id']} OK - nessun contenuto vietato")
    except Exception as e:
        print(f"Errore in process_job: {e}")


def main():
    while True:
        try:
            _, job_bytes = r.blpop('moderation_jobs_raw')
            job_data = json.loads(job_bytes.decode('utf-8'))
            process_job(job_data)
        except Exception as e:
            print(f"Errore nel worker loop: {e}")


if __name__ == "__main__":
    main()
