const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
let angle = 0;
let offset = 0;

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } catch (error) {
        console.error('Error accessing the camera: ', error);
    }
}

async function loadModel() {
    try {
        const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
        return detector;
    } catch (error) {
        console.error('Error loading the model: ', error);
    }
}

function drawRotatingTriangle(x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, size);
    ctx.lineTo(-size, size);
    ctx.closePath();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function drawKeypoints(keypoints) {
    keypoints.forEach((keypoint) => {
        if (keypoint.score > 0.5) {
            drawRotatingTriangle(keypoint.x, keypoint.y, 5, angle);
        }
    });
}

function drawSkeleton(keypoints) {
    const adjacentKeyPoints = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
    adjacentKeyPoints.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];

        if (kp1.score > 0.5 && kp2.score > 0.5) {
            ctx.setLineDash([10, 5]);
            ctx.lineDashOffset = -offset;
            ctx.beginPath();
            ctx.moveTo(kp1.x, kp1.y);
            ctx.lineTo(kp2.x, kp2.y);
            ctx.strokeStyle = 'Lime';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
}

function getBodyPart(keypoints, part) {
    const keypoint = keypoints.find(kp => kp.name === part);
    if (keypoint && keypoint.score > 0.5) {
        return { x: keypoint.x, y: keypoint.y };
    }
    return null;
}

function displayBodyParts(keypoints) {
    const parts = ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
    const labels = {
        'nose': 'Голова',
        'left_shoulder': 'Ліве плече',
        'right_shoulder': 'Праве плече',
        'left_elbow': 'Лівий лікоть',
        'right_elbow': 'Правий лікоть',
        'left_wrist': 'Ліве зап*ястя',
        'right_wrist': 'Праве зап*ястя',
        'left_hip': 'Ліве стегно',
        'right_hip': 'Праве стегно',
        'left_knee': 'Ліве коліно',
        'right_knee': 'Праве коліно',
        'left_ankle': 'Ліва щиколотка',
        'right_ankle': 'Права щиколотка'
    };

    parts.forEach(part => {
        const keypoint = getBodyPart(keypoints, part);
        if (keypoint) {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.font = '12px Arial';
            ctx.strokeText(labels[part], keypoint.x + 5, keypoint.y + 5);
            ctx.fillText(labels[part], keypoint.x + 5, keypoint.y + 5);
        }
    });
}

async function detectPose(detector) {
    try {
        const poses = await detector.estimatePoses(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        poses.forEach(pose => {
            drawKeypoints(pose.keypoints);
            drawSkeleton(pose.keypoints);
            displayBodyParts(pose.keypoints);
        });

        angle += 0.01; // Уповільнення обертання трикутників
        offset += 1;
        if (offset > 15) {
            offset = 0;
        }

        requestAnimationFrame(() => detectPose(detector));
    } catch (error) {
        console.error('Error detecting poses: ', error);
    }
}

async function main() {
    await setupCamera();
    const detector = await loadModel();
    if (detector) {
        detectPose(detector);
    }
}

main();