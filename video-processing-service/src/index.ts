import express from 'express';
import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from './storage';

setupDirectories();
const app = express();

app.post('/process-video', async(req, res) => {
  //Get the bucket and filename from the Cloud Pub/Sub message.
  let data;
  try {
    const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error("Attribute 'name' missing from message");
    }
  } catch (error) {
    console.error(error);
    return res.status(400).send('Bad Request: missing filename.')
  }

  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;

  // Download the raw video from Cloud Storage
  await downloadRawVideo(inputFileName);

  // Convert the video to 360p
  try {
    convertVideo(inputFileName, outputFileName); 
  } catch (err) {
    Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName)
    ]);
    console.error(err);
    return res.status(500).send('Error processing video'); 
  }

  // upload the processed video to Cloud Storage
   await uploadProcessedVideo(outputFileName);
  
   await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName)
  ]);

  res.status(200).send('Video processed successfully');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
