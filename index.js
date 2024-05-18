const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const TOKEN = process.env.TOKEN;
const MODEL_NAME = process.env.MODEL_NAME;
const API_KEY = process.env.API_KEY;
const RAPIDAPI_KEY = process.env.RAPID_KEY;

// Validate environment variables
if (!TOKEN || !MODEL_NAME || !API_KEY || !RAPIDAPI_KEY) {
    console.error("One or more required environment variables are missing.");
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

async function runChat(msg) {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const generationConfig = {
            temperature: 1,
            topK: 0,
            topP: 0.95,
            maxOutputTokens: 8192,
        };

        const safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
        ];

        const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: [],
        });

        const result = await chat.sendMessage(msg);
        return result.response.text();
    } catch (error) {
        console.error("Error in runChat:", error);
        throw new Error("Failed to process the chat message.");
    }
}

bot.onText(/\/findjob (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1]; // Extract the query from the message

    // Validate the query
    if (!query) {
        await bot.sendMessage(chatId, "Please provide a job search query after the /findjob command, i.e /findjob python developer.");
        return;
    }

    try {
        console.log("User query:", query);

        // You can choose to clean the query using Google's Generative AI or any other method here
        // const cleanedQuery = await runChat(query);
        const cleanedQuery = query; // Assume the query is cleaned for now
        console.log("Cleaned query:", cleanedQuery);

        const options = {
            method: 'GET',
            url: 'https://jsearch.p.rapidapi.com/search',
            params: {
                query: cleanedQuery,
                page: '1',
                num_pages: '1'
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const jobs = response.data.data;

        if (jobs.length === 0) {
            await bot.sendMessage(chatId, 'No jobs found.');
        } else {
            jobs.forEach((jobData, index) => {
                const jobTitle = jobData.job_title;
                const company = jobData.employer_name;
                const applyLink = jobData.job_apply_link;
                const message = `Job ${index + 1} / ${jobs.length}:\nTitle: ${jobTitle}\nCompany: ${company}\nApply here: ${applyLink}`;
                bot.sendMessage(chatId, message);
            });
        }
    } catch (error) {
        console.error("Error in job search:", error);
        await bot.sendMessage(chatId, 'Sorry, an error occurred while processing your request.');
    }
});
