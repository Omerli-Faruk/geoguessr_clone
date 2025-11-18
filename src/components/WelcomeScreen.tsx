"use client";

type WelcomeScreenProps = {
  gamesPlayed: number;
  totalScore: number;
  onStartGame: () => void;
};

export default function WelcomeScreen({ gamesPlayed, totalScore, onStartGame }: WelcomeScreenProps) {
  const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center p-8 animated-gradient">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10">
        <h1 className="text-6xl md:text-7xl font-bold mb-4 text-white drop-shadow-lg">GeoBleedat</h1>
        <p className="text-lg md:text-xl mb-10 text-gray-200 drop-shadow-md">Haritadaki konumu tahmin et, ne kadar yakınsan o kadar çok puan kazan!</p>

        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <StatCard label="Oynanan Oyun" value={gamesPlayed.toLocaleString()} color="text-blue-400" />
          <StatCard label="Toplam Puan" value={totalScore.toLocaleString()} color="text-green-400" />
          <StatCard label="Ortalama Puan" value={averageScore.toLocaleString()} color="text-yellow-400" />
        </div>

        <button
          onClick={onStartGame}
          className="bg-white/20 text-white font-bold py-4 px-12 rounded-full shadow-2xl border border-white/30
                     transition-all-fast transform hover:scale-105 hover:bg-white/30 focus:outline-none 
                     focus:ring-4 focus:ring-white/50 text-2xl backdrop-blur-sm"
        >
          Oyuna Başla
        </button>
      </div>
    </div>
  );
}

// İstatistik kartları için ayrı bir bileşen
const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="glass-effect p-6 rounded-2xl shadow-lg w-52">
    <p className={`text-4xl font-bold ${color}`}>{value}</p>
    <p className="text-gray-300 mt-1">{label}</p>
  </div>
);
