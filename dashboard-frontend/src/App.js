import React, { useEffect, useState } from 'react';
import './App.css';
import { db, collection, getDocs } from './firebase';

function App() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const snapshot = await getDocs(collection(db, 'metaTopGames'));
      const data = snapshot.docs.map(doc => doc.data());
      setGames(data);
    }
    fetchData();
  }, []);

  // useEffect(() => {
  //   fetch('/api/games')
  //     .then(res => {
  //       if (!res.ok) throw new Error('Network response was not ok');
  //       return res.text();
  //     })
  //     .then(text => {
  //       try {
  //         const json = JSON.parse(text);
  //         setGames(json);
  //       } catch (err) {
  //         console.error('JSON parse error:', err, 'Response:', text);
  //         setGames([]);
  //       }
  //     })
  //     .catch(err => {
  //       console.error('Failed to fetch games:', err);
  //       setGames([]);
  //     });
  // }, []);


return (
  <div className="container">
    <h1 className="title">Top 50 Meta VR Games</h1>
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Sl No.</th>
            <th>Game Name</th>
            <th>Release Date</th>
            <th>Rating</th>
            <th>Ratings & Reviews</th>
            <th>Game URL</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{game.name || '-'}</td>
              <td>{game.releaseDate || '-'}</td>
              <td>{game.rating || '-'}</td>
              <td>{game.ratingsReviews || '-'}</td>
              <td>
                <a href={game.url} target="_blank" rel="noreferrer">Visit</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default App;
