"use client";

type WelcomeScreenProps = {
  gamesPlayed: number;
  totalScore: number;
  onStartGame: () => void;
};

export default function WelcomeScreen({ gamesPlayed, totalScore, onStartGame }: WelcomeScreenProps) {
  const averageScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

  return (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center p-4 md:p-8 animated-gradient">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center">
        {/* Mobil için daha küçük başlık: text-4xl */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white drop-shadow-lg">GeoBleedat</h1>
        {/* Mobil için daha küçük alt başlık ve azaltılmış margin */}
        <p className="text-base md:text-xl mb-8 md:mb-10 text-gray-200 drop-shadow-md max-w-xl px-4">Haritadaki konumu tahmin et, ne kadar yakınsan o kadar çok puan kazan!</p>

        {/* Mobil için azaltılmış boşluk ve margin */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-10 md:mb-12 w-full md:w-auto px-4 md:px-0">
          <StatCard label="Oynanan Oyun" value={gamesPlayed.toLocaleString()} color="text-blue-400" />
          <StatCard label="Toplam Puan" value={totalScore.toLocaleString()} color="text-green-400" />
          <StatCard label="Ortalama Puan" value={averageScore.toLocaleString()} color="text-yellow-400" />
        </div>

        <button
          onClick={onStartGame}
          // Mobil için daha küçük buton
          className="bg-white/20 text-white font-bold py-3 px-8 text-lg md:py-4 md:px-12 md:text-2xl rounded-full shadow-2xl border border-white/30
                     transition-all-fast transform hover:scale-105 hover:bg-white/30 focus:outline-none 
                     focus:ring-4 focus:ring-white/50 backdrop-blur-sm"
        >
          Oyuna Başla
        </button>
      </div>
    </div>
  );
}

// İstatistik kartları için ayrı bir bileşen
const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  // Mobil için azaltılmış padding
  <div className="glass-effect p-4 md:p-6 rounded-2xl shadow-lg w-full md:w-52">
    {/* Mobil için daha küçük değer metni */}
    <p className={`text-2xl md:text-4xl font-bold ${color}`}>{value}</p>
    <p className="text-gray-300 mt-1">{label}</p>
  </div>
);
