"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import WelcomeScreen from "@/components/WelcomeScreen";
import Cookies from "js-cookie";

// Game bileşenini sadece istemci tarafında ve ihtiyaç duyulduğunda yükle
const Game = dynamic(() => import('@/components/Game'), {
  ssr: false, // Sunucu tarafında render etme
  loading: () => <LoadingSpinner message="Oyun Yükleniyor..." />,
});

// Tutarlı bir yükleme ekranı bileşeni
const LoadingSpinner = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-400 border-solid mb-4"></div>
      {message && <p className="text-xl font-bold">{message}</p>}
    </div>
);

export default function Home() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    // Bu useEffect, bileşen istemci tarafında yüklendiğinde çalışır.
    // Böylece cookie okuma ve state güncelleme işlemleri sadece istemcide yapılır.
    const savedGamesPlayed = Cookies.get("gamesPlayed");
    const savedTotalScore = Cookies.get("totalScore");

    if (savedGamesPlayed) {
      setGamesPlayed(parseInt(savedGamesPlayed, 10));
    }
    if (savedTotalScore) {
      setTotalScore(parseInt(savedTotalScore, 10));
    }
    
    // Tüm istemci taraflı işlemler bittiğinde, bileşenin "hydrate" olduğunu işaretle.
    setIsHydrated(true);
  }, []);

  const handleStartGame = () => {
    setIsGameStarted(true);
  };

  const handleGameEnd = (score: number) => {
    if (score > 0) {
      const newTotalScore = totalScore + score;
      const newGamesPlayed = gamesPlayed + 1;

      setTotalScore(newTotalScore);
      setGamesPlayed(newGamesPlayed);

      Cookies.set("totalScore", newTotalScore.toString(), { expires: 365 });
      Cookies.set("gamesPlayed", newGamesPlayed.toString(), { expires: 365 });
    }
    setIsGameStarted(false);
  };

  if (!isHydrated) {
    // Sunucu render'ında ve ilk istemci render'ında, hydration hatasını önlemek için bir yükleme durumu göster.
    return <LoadingSpinner />;
  }

  return (
    <main className="w-full h-screen overflow-hidden">
      {isGameStarted ? (
        <Game onGameEnd={handleGameEnd} />
      ) : (
        <WelcomeScreen
          gamesPlayed={gamesPlayed}
          totalScore={totalScore}
          onStartGame={handleStartGame}
        />
      )}
    </main>
  );
}
