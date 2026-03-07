# Chess Analysis Tool

A simple web-based chess analysis tool. Users can load PGN files, view moves on a chessboard, and see engine evaluations as a bar and a line chart. The tool runs entirely in the browser using JavaScript, Stockfish, and Chessground.

## Features

- Load PGN by pasting it into the input box
- Navigate moves with Previous, Next, and Reset buttons
- Evaluation bar showing advantage for White or Black
- Line chart showing evaluation changes over the game
- Displays player names from PGN headers
- Uses Stockfish in a Web Worker so the interface remains responsive

## How to use

Hosted on GitHub Pages, at: https://george-hartley.github.io/chess-analysis/

Alternatively,
1. Download or clone the repository
2. Open `index.html` in a browser
3. Paste a PGN into the input box and click Load PGN
4. Use the controls to move through the game and see evaluations

All libraries are included in the `libs/` folder. No installation or server is required.

## File structure


index.html Main HTML file

style.css CSS styling

board.js Chessboard and move handling

graph.js Evaluation bar and line chart

libs/ External libraries (Chessground, Stockfish, jQuery)

README.md This file


## Browser support

Tested on Chrome, Firefox, Edge, and Safari. Designed for desktop screens; mobile works but may not be fully optimized.

## License

Educational project. All external libraries follow their own licenses.
