api key ：sk-RR4ydcJd9yqz30xELkfEWAnLLODUsqc1etRNwKjRkMgNyIv4
URL ： https://open.lxcloud.dev/v1/images/generations



import fs from "fs";
import OpenAI, { toFile } from "openai";

const client = new OpenAI();

const prompt = `
Generate a photorealistic image of a gift basket on a white background 
labeled 'Relax & Unwind' with a ribbon and handwriting-like font, 
containing all the items in the reference pictures.
`;

const imageFiles = [
    "bath-bomb.png",
    "body-lotion.png",
    "incense-kit.png",
    "soap.png",
];

const images = await Promise.all(
    imageFiles.map(async (file) =>
        await toFile(fs.createReadStream(file), null, {
            type: "image/png",
        })
    ),
);

const response = await client.images.edit({
    model: "gpt-image-1",
    image: images,
    prompt,
});

// Save the image to a file
const image_base64 = response.data[0].b64_json;
const image_bytes = Buffer.from(image_base64, "base64");
fs.writeFileSync("basket.png", image_bytes);