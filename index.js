const TelegramBot = require('node-telegram-bot-api');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const TOKEN = process.env.TOKEN;
const MODEL_NAME = process.env.MODEL_NAME;
const API_KEY = process.env.API_KEY;
const RAPIDAPI_KEY = process.env.RAPID_KEY;

const bot = new TelegramBot(TOKEN, { polling: true });

async function runChat(msg) {
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
    const response = result.response;
    return response.text();
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    try {
        const response = await runChat(messageText);
        bot.sendMessage(chatId, response);
    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, 'Sorry, an error occurred while processing your request.');
    }

    try {
      const options = {
          method: 'GET',
          url: 'https://jsearch.p.rapidapi.com/search',
          params: {
              query: 'Python developer ',
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
          bot.sendMessage(chatId, 'No jobs found.');
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
      console.error(error);
  }
  
  
});
