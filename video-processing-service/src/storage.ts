import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';


const storage = new Storage();

const rawVideoBucketName = "ncode-ytube-raw-videos";
const processedVideoBucketName = "ncode-ytube-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

/**
 * 
 * Creates the local directories for raw and processed videos.
 */

export function setupDirectories() {
    ensureDirectory(localRawVideoPath);
    ensureDirectory(localProcessedVideoPath);
}

/**
 * 
 * @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}.
 * @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}.
 * @returns A promise that resolves when the video has been converted.
 */
export function convertVideo(rawVideoName: string, processedVideoName: string) {
    return new Promise<void>((resolve, reject) => {
        ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
        .outputOptions("-vf", "scale=-1:360") //360p 
        .on("end", () => {
            console.log("Processing finished");
            resolve();
        })
        .on("error", (err) => {
            console.log("Error processing video: ", err);
            reject(err);
        })
        .save(`${localProcessedVideoPath}/${processedVideoName}`);
    });

}

/**
 * 
 * @param fileName - The name of the file to download from the 
 * {@link rawVideoBucketName} directory into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been uploaded.
 */
export async function downloadRawVideo(fileName: string) {  
    await storage.bucket(rawVideoBucketName).file(fileName).download({destination: `${localRawVideoPath}/${fileName}`});

    console.log(
        `gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`
    );
}


/**
 * 
 * @param fileName - The name of the file to upload from the 
 * {@link localProcessedVideoPath} directory into the {@link processedVideoBucketName} bucket.
 * @returns A promise that resolves when the file has been uploaded.
 */

export async function uploadProcessedVideo(fileName:string) {
    const bucket = storage.bucket(processedVideoBucketName);

    bucket.upload(`${localProcessedVideoPath}/${fileName}`, {
        destination: fileName,
    });

    console.log(`${fileName} uploaded to ${processedVideoBucketName}.`)

    await bucket.file(fileName).makePublic();
}

function deleteFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log(`Error deleting file: ${err}`);
                    reject(err);
                } else {
                    console.log(`File deleted at ${filePath}`); 
                    resolve();
                }
            });            
        } else {
            console.log(`File not found at ${filePath}, skipping the delete.`);

        }


    });
}

export function deleteRawVideo(fileName: string) {
    return deleteFile(`${localRawVideoPath}/${fileName}`);
}

export function deleteProcessedVideo(fileName: string) {
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * Ensures a directory exists, creating it if necessary.
 * @param dirPath - The path of the directory to ensure exists.
 */
function ensureDirectory(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
        console.log(`Directory created at ${dirPath}`);
    }
}