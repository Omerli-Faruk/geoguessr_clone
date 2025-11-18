"use client";

type WelcomeScreenProps = {
  gamesPlayed: number;
  totalScore: number;
  onStartGame: () => void;
};

export default function WelcomeScreen({ gamesPlayed, totalScore, onStartGame }: WelcomeScreenProps) {
  const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

  return (
    // 1. Ana konteyner için duyarlı padding
    <div className="flex flex-col items-center justify-center h-screen text-white text-center p-4 sm:p-8 animated-gradient">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* 2. Başlık ve alt başlık için duyarlı metin boyutları */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 text-white drop-shadow-lg">GeoBleedat</h1>
        <p className="text-base sm:text-lg mb-8 md:mb-10 text-gray-200 drop-shadow-md max-w-md">Haritadaki konumu tahmin et, ne kadar yakınsan o kadar çok puan kazan!</p>

        {/* 3. İstatistik kartları için duyarlı yerleşim */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-10 md:mb-12 w-full px-4 sm:px-0 items-center">
          <StatCard label="Oynanan Oyun" value={gamesPlayed.toLocaleString()} color="text-blue-400" />
          <StatCard label="Toplam Puan" value={totalScore.toLocaleString()} color="text-green-400" />
          <StatCard label="Ortalama Puan" value={averageScore.toLocaleString()} color="text-yellow-400" />
        </div>

        <button
          onClick={onStartGame}
          // 4. Buton için duyarlı boyutlandırma
          className="bg-white/20 text-white font-bold py-3 px-8 sm:py-4 sm:px-12 rounded-full shadow-2xl border border-white/30
                     transition-all-fast transform hover:scale-105 hover:bg-white/30 focus:outline-none 
                     focus:ring-4 focus:ring-white/50 text-xl sm:text-2xl backdrop-blur-sm"
        >
          Oyuna Başla
        </button>
      </div>
    </div>
  );
}

// İstatistik kartları için ayrı bir bileşen
const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  // 5. Kart boyutu ve metinler için duyarlı sınıflar
  <div className="glass-effect p-4 rounded-2xl shadow-lg w-full max-w-xs sm:w-52">
    <p className={`text-3xl sm:text-4xl font-bold ${color}`}>{value}</p>
    <p className="text-gray-300 mt-1 text-sm sm:text-base">{label}</p>
  </div>
);
