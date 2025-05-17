// const express = require('express');
// const cors = require('cors');
// const puppeteer = require('puppeteer');
// const cron = require('node-cron');
// const admin = require('firebase-admin');
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import cron from 'node-cron';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

let serviceAccount;

if (process.env.GOOGLE_CREDENTIALS) {
  serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} else {
  serviceAccount = JSON.parse(readFileSync('./firebase-credentials.json'));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
app.use(cors());

// Function to scrape Meta VR games\
async function scrapeTopGames() {
  console.log('Scraper Started');
  const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process', ], });
  const page = await browser.newPage();
  await new Promise(res => setTimeout(res, 3000));
  await page.goto('https://www.meta.com/en-gb/experiences/section/325830172628417/', { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('Main Listing Page Loaded');

  const hrefs = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('a[role="link"]'))
      .map(el => el.getAttribute('href'))
      .filter(href => {
        if (!href || !href.startsWith('/en-gb/experiences/')) return false;

        const relativePath = href.replace('/en-gb/experiences/', '');
        if (relativePath.includes('view') || relativePath.includes('section')) return false;

        const regex = /^\/en-gb\/experiences\/[a-z][^\/]*\/\d+\/$/i;
        return regex.test(href);
      });
      list.push('/en-gb/experiences/tempo-travelers/9099897866785044/');
      return list.slice(0, 50);
  });

  console.log(`Found ${hrefs.length} game links`);

  const games = [];
  for (const href of hrefs) {
    const gamePage = await browser.newPage();
    const fullUrl = 'https://www.meta.com' + href;
    console.log(`Scraping ${fullUrl}`)
    try {
      const gamePage = await browser.newPage();
      await gamePage.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      const gameData = await gamePage.evaluate(() => {
        const getTextAfterLabel = (label) => {
          const spans = Array.from(document.querySelectorAll('span'));
          for (let i = 0; i < spans.length; i++) {
            if (spans[i].innerText.toLowerCase().includes(label)) {
              const next = spans[i + 1];
              if (next) return next.innerText.trim();
            }
          }
          return null;
        };

      const getSpanText = (label) => {
        const span = Array.from(document.querySelectorAll('span')).find(
          el => el.innerText.toLowerCase().includes(label)
        );
        return span ? span.innerText.trim() : null;
      };

      const getNextH1 = (label) => {
        const spans = Array.from(document.querySelectorAll('span'));
        for (let i = 0; i < spans.length; i++) {
          if (spans[i].innerText.toLowerCase().includes(label)) {
            const h1 = document.querySelector('h1');
            return h1 ? h1.innerText.trim() : null;
          }
        }
        return null;
      };

      const getRatingFromAriaLabel = () => {
        const divs = Array.from(document.querySelectorAll('div'));
        for (let div of divs) {
          const label = div.getAttribute('aria-label');
          if (label && label.toLowerCase().includes('out of 5 rating')) {
            return label.substring(0, 5).trim();
          }
        }
        return null;
      };

      const getGameName = () => {
        const ratingDiv = Array.from(document.querySelectorAll('div')).find(div => {
          const label = div.getAttribute('aria-label');
          return label && label.toLowerCase().includes('1 out of 1 rating');
        });

        if (ratingDiv) {
          let parent = ratingDiv.parentElement;
          for (let i = 0; i < 2; i++) {
            if (parent) {
              parent = parent.parentElement;
            }
          }
          const nameDiv = parent ? parent.querySelector('div') : null;
          if (nameDiv) {
            const text = nameDiv.innerText.trim();
            return text.split('\n')[0];
          }
        }

        return null;
      };

      return {
        url: window.location.href,
        name: getGameName(),
        releaseDate: getTextAfterLabel('release date'),
        website: getTextAfterLabel
        ('website'),
        //rating: getNextH1('all ratings'),
        rating: getRatingFromAriaLabel(),
        ratingsReviews: getSpanText('ratings,')
      };
    });
    console.log(`Extracted game data:`, gameData)
    await gamePage.close();
    games.push(gameData);
  } catch (err) {
    console.error(`Error scraping $(fullUrl}:`, err.message);
  }
}

  const now = new Date();
  for (const game of games) {
    if (game && game.url) {
      console.log(`Writing to firestore: ${game.url}`);
      const gameId = game.url.split('/').filter(Boolean).pop();
      await db.collection('metaTopGames').doc(gameId).set({
      ...game,
        updatedAt: now.toISOString()
      });
    }
  }
  console.log('Scraping & Saving Complete')
  await browser.close();
}

try {
  await scrapeTopGames();
} catch (err) {
  console.error('Scraper Failed!', err);
}

//cron.schedule('0 * * * *', scrapeTopGames); // runs every hour

app.get('/api/games', async (req, res) => {
  const snapshot = await db.collection('metaTopGames').get();
  const data = snapshot.docs.map(doc => doc.data());
  res.json(data);
});

app.listen(3000, () => console.log('Server running on port 3000'));