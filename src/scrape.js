import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = "https://webapp.science.hku.hk/sr4/servlet/enquiry?Type=Major&Code=MajorInPhysicsIntensive&AdmissionYear=2023";
const courseUrlBase = "https://webapp.science.hku.hk/sr4/servlet/enquiry?Type=Course&course_code=";

async function scrapeCourses() {
  try {
    // Fetch raw HTML
    const { data } = await axios.get(url);

    // Load into Cheerio
    const $ = cheerio.load(data);

    const courses = [];

    // Adjust selectors based on the site’s HTML structure
    $("#table1 tr").each((i, el) => {
      const tds = $(el).find("td");
      
      // Ensure it's a course row (usually has multiple columns, unlike headers)
      if (tds.length >= 2) {
        const code = $(tds[0]).text().trim();
        const title = $(tds[1]).text().trim();

        if (code && title) {
          courses.push({
            code,
            title
          });
        }
      }
    });

    return courses;
  } catch (err) {
    console.error("Error scraping:", err.message);
    return [];
  }
}

function parsePrereqString(str) {
  if (!str) return null;
  
  // Ignore anti-requisites (everything after "not for")
  const prereqPart = str.split(/not for/i)[0];
  
  // Extract only logical operators, parentheses, and course codes
  const tokens = prereqPart.match(/\(|\)|\band\b|\bor\b|[A-Z]{3,4}\s?\d{4}/gi);
  if (!tokens) return null; // Return null if no courses found

  let pos = 0;

  function parsePrimary() {
    if (pos >= tokens.length) return null;
    const token = tokens[pos++];
    if (token === '(') {
      const expr = parseOr();
      if (pos < tokens.length && tokens[pos] === ')') {
        pos++; // consume ')'
      }
      return expr;
    } else {
      return token.toUpperCase().replace(/\s+/g, ''); // Normalize course code
    }
  }

  function parseAnd() {
    let left = parsePrimary();
    let ands = left ? [left] : [];
    while (pos < tokens.length && tokens[pos].toLowerCase() === 'and') {
      pos++; // consume 'and'
      const right = parsePrimary();
      if (right) ands.push(right);
    }
    return ands.length > 1 ? { and: ands } : ands[0];
  }

  function parseOr() {
    let left = parseAnd();
    let ors = left ? [left] : [];
    while (pos < tokens.length && tokens[pos].toLowerCase() === 'or') {
      pos++; // consume 'or'
      const right = parseAnd();
      if (right) ors.push(right);
    }
    return ors.length > 1 ? { or: ors } : ors[0];
  }

  function cleanAst(node) {
    if (!node) return null;
    if (typeof node === 'string') {
      // Only keep valid course codes (e.g., MATH1009)
      if (/^[A-Z]{3,4}\d{4}$/.test(node)) {
        return node;
      }
      return null;
    }
    if (node.and) {
      const cleaned = node.and.map(cleanAst).filter(Boolean);
      if (cleaned.length === 0) return null;
      if (cleaned.length === 1) return cleaned[0];
      return { and: cleaned };
    }
    if (node.or) {
      const cleaned = node.or.map(cleanAst).filter(Boolean);
      if (cleaned.length === 0) return null;
      if (cleaned.length === 1) return cleaned[0];
      return { or: cleaned };
    }
    return null;
  }

  const parsed = parseOr();
  return cleanAst(parsed);
}

async function scrapePrerequisites(courseCode) {
  try {
    const url = `${courseUrlBase}${courseCode}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    // Find the th containing "Pre-requisites", then get the next td sibling
    // Using a broader selector "th" in case ".courseDetails" class is missing
    const prereqText = $("th").filter((i, el) => $(el).text().includes("Pre-requisites")).next("td").text().trim();
    console.log(courseCode); // Debug: Check tokenization result
    
    return {
      raw: prereqText,
      parsed: parsePrereqString(prereqText)
    };
  } catch (err) {
    console.error(`Error fetching details for ${courseCode}:`, err.message);
    return null;
  }
}

// Run directly
const courses = await scrapeCourses();
const courseDetails = await Promise.all(courses.map(async (course) => {
  const prereqs = await scrapePrerequisites(course.code);
  return {
    ...course,
    prerequisites: prereqs
  };
}));

// Write to data.js so index.html can load it automatically
const outputPath = path.join(__dirname, "..", "data.js");
const fileContent = `const courseData = ${JSON.stringify(courseDetails, null, 2)};`;
fs.writeFileSync(outputPath, fileContent, "utf-8");

console.log(`Successfully scraped ${courseDetails.length} courses and saved to data.js`);
