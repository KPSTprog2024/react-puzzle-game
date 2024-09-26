import React, { useState, useRef, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { isMobile } from 'react-device-detect';

const Backend = isMobile ? TouchBackend : HTML5Backend;

const PuzzlePiece = ({ id, src, position, onDrop }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'piece',
    item: { id, position },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <img
      ref={drag}
      src={src}
      alt={`Piece ${id}`}
      style={{
        width: '100%',
        height: '100%',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    />
  );
};

const PuzzleBoard = ({ pieces, onPieceDrop, boardSize }) => {
  const [, drop] = useDrop(() => ({
    accept: 'piece',
    drop: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      const left = Math.round(item.position.left + delta.x);
      const top = Math.round(item.position.top + delta.y);
      onPieceDrop(item.id, left, top);
      return undefined;
    },
  }));

  return (
    <div
      ref={drop}
      style={{
        position: 'relative',
        width: boardSize,
        height: boardSize,
        border: '1px solid black',
      }}
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: `${piece.position.left}%`,
            top: `${piece.position.top}%`,
            width: `${100 / Math.sqrt(pieces.length)}%`,
            height: `${100 / Math.sqrt(pieces.length)}%`,
          }}
        >
          <PuzzlePiece {...piece} />
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [pieceCount, setPieceCount] = useState(30);
  const [completed, setCompleted] = useState(false);
  const [boardSize, setBoardSize] = useState(600);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && uploadedImages.length < 5) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages([...uploadedImages, e.target.result]);
        setCurrentImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else if (uploadedImages.length >= 5) {
      alert('You can only upload up to 5 images.');
    }
  };

  const splitImage = (image, rows, cols) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const pieces = [];
        const pieceWidth = img.width / cols;
        const pieceHeight = img.height / rows;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const canvas = document.createElement('canvas');
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
              img,
              x * pieceWidth,
              y * pieceHeight,
              pieceWidth,
              pieceHeight,
              0,
              0,
              pieceWidth,
              pieceHeight
            );
            pieces.push({
              id: y * cols + x,
              src: canvas.toDataURL(),
              position: {
                left: Math.random() * 100,
                top: Math.random() * 100,
              },
            });
          }
        }
        resolve(pieces);
      };
      img.src = image;
    });
  };

  const startPuzzle = async () => {
    if (!currentImage) {
      alert('Please upload an image first.');
      return;
    }
    if (!pieceCount) {
      alert('Please select the number of pieces.');
      return;
    }
    const rows = Math.sqrt(pieceCount);
    const cols = rows;
    const newPieces = await splitImage(currentImage, rows, cols);
    setPieces(newPieces);
    setCompleted(false);
  };

  const handlePieceDrop = (id, left, top) => {
    const updatedPieces = pieces.map((piece) =>
      piece.id === id ? { ...piece, position: { left, top } } : piece
    );
    setPieces(updatedPieces);
    checkCompletion(updatedPieces);
  };

  const checkCompletion = (currentPieces) => {
    const tolerance = 10; // pixels
    const isCompleted = currentPieces.every((piece) => {
      const correctPosition = {
        left: (piece.id % Math.sqrt(pieceCount)) * (100 / Math.sqrt(pieceCount)),
        top: Math.floor(piece.id / Math.sqrt(pieceCount)) * (100 / Math.sqrt(pieceCount)),
      };
      return (
        Math.abs(piece.position.left - correctPosition.left) <= tolerance &&
        Math.abs(piece.position.top - correctPosition.top) <= tolerance
      );
    });
    if (isCompleted) {
      setCompleted(true);
      alert('Congratulations! You completed the puzzle!');
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setBoardSize(Math.min(window.innerWidth * 0.8, 600));
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <DndProvider backend={Backend}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <h1>iPad Jigsaw Puzzle</h1>
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button onClick={() => fileInputRef.current.click()}>
            Upload Image (Max 5)
          </button>
          <input
            type="number"
            value={pieceCount}
            onChange={(e) => setPieceCount(Number(e.target.value))}
            min={4}
            max={100}
          />
          <button onClick={startPuzzle}>Start Puzzle</button>
        </div>
        <div style={{ marginTop: '20px' }}>
          {uploadedImages.length > 0 && (
            <div>
              <h3>Select an image:</h3>
              {uploadedImages.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Uploaded ${index + 1}`}
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    margin: '5px',
                    cursor: 'pointer',
                    border: currentImage === img ? '2px solid blue' : 'none',
                  }}
                  onClick={() => setCurrentImage(img)}
                />
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            width: '100%',
            height: `${boardSize}px`,
            marginTop: '20px',
            border: '1px solid black',
          }}
        >
          <PuzzleBoard pieces={pieces} onPieceDrop={handlePieceDrop} boardSize={boardSize} />
        </div>
        {completed && (
          <div style={{ marginTop: '20px' }}>
            <h2>Puzzle completed! Select a new image to continue.</h2>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default App;
