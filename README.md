# HKU PHYS Course Prerequisites Visualization

An interactive web application that visualizes the prerequisite relationships for Physics courses at the University of Hong Kong (HKU).

The application is deployed via GitHub Pages. You can access it here:
[https://ryanpangsy.github.io/PHYS-Course-Prerequisite/](https://ryanpangsy.github.io/PHYS-Course-Prerequisite/)

![HKU PHYS Course Prerequisites Visualization](img/readme_01.png)
## Features

- **Interactive Graph:** A force-directed graph built with D3.js showing how courses connect through "AND" / "OR" prerequisite logic.
- **Course Tracking:** Add courses you have already studied to see which new courses you are eligible to take.
- **Color Coding:** 
  - 🟢 **Green:** Courses you have studied.
  - 🟠 **Orange:** Courses you are eligible to study based on your completed prerequisites.
  - ⚪ **Grey:** Courses you cannot study yet.
- **Prerequisite Checker:** Search for a specific target course to view a detailed, hierarchical breakdown of its prerequisites.
- **Direct Links:** Click on any course node in the graph to open the official HKU course syllabus page.

## Author

Created by **rpsy6138** (Ryan Pang)
