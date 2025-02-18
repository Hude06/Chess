import { Chess } from "./node_modules/chess.js/dist/esm/chess.js";

const socket = io(); // Connect to the server
let board = null;
let game = new Chess();
let evalID = document.getElementById("value");
let evalNUM = 0;
evalID.innerHTML = evalNUM;

// When the server assigns a color, initialize the board accordingly.
socket.on('color', (color) => {
  console.log('Received color:', color);
  const config = {
    orientation: color === 1 ? 'white' : 'black',
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: window["chess24_piece_theme"],
  };
  board = Chessboard('board', config);
});

// Listen for additional messages from the server.
socket.on('message', (msg) => {
  console.log('Server message:', msg);
  alert(msg)
});

// (Optional) If your backend uses a "startGame" event.
socket.on('startGame', (data) => {
  console.log('Game started in room:', data.room);
});

// Listen for the opponent's move and update the game state.
socket.on('move', (move) => {
  console.log('Received opponent move:', move);
  game.move(move);
  board.position(game.fen());
  updateEvaluation();
});

console.log("Starting");

// Piece values for evaluation
const pieceValues = {
  p: 1,  // Pawn
  n: 3,  // Knight
  b: 3,  // Bishop
  r: 5,  // Rook
  q: 9,  // Queen
  k: 0   // King (King doesn't have a value)
};

// Prevent dragging if the game is over or it's not the player's turn.
function onDragStart(source, piece, position, orientation) {
  if (game.isGameOver()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

// Calculate material points for both sides.
function calculatePoints(boardState) {
  let whitePoints = 0;
  let blackPoints = 0;
  
  // game.board() returns a 2D array of pieces and empty squares.
  for (let row of boardState) {
    for (let square of row) {
      if (square) {
        const pieceValue = pieceValues[square.type.toLowerCase()];
        if (square.color === 'w') {
          whitePoints += pieceValue;
        } else if (square.color === 'b') {
          blackPoints += pieceValue;
        }
      }
    }
  }
  
  return { whitePoints, blackPoints };
}

// Update evaluation bar based on current board material.
function updateEvaluation() {
  const points = calculatePoints(game.board());
  const realEval = points.whitePoints - points.blackPoints;
  evalNUM = realEval;
  evalID.innerHTML = evalNUM;
}

// When a piece is dropped, attempt to make the move.
function onDrop(source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q' // Always promote to a queen for simplicity.
  });
  
  // If the move is illegal, snap the piece back.
  if (move === null) return 'snapback';
  console.log(move)
  
  board.position(game.fen());
  updateEvaluation();
  
  // Send the move to the server so that the opponent can update their board.
  socket.emit('move', move);
}

// After a move is complete, update the board position.
function onSnapEnd() {
  board.position(game.fen());
}
