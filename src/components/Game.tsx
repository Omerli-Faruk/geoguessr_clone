"use client";

import { useEffect, useRef, useState } from "react";
import "mapillary-js/dist/mapillary.css";
import "leaflet/dist/leaflet.css";

// Token
const MAPILLARY_TOKEN = process.env.NEXT_PUBLIC_MAPILLARY_TOKEN || "";
type AreaItem = { name: string; bbox: number[] };
type LocationItem = { id: string; lat: number; lng: number; name: string };

// Prop Types
type GameProps = {
  onGameEnd: (score: number) => void;
};

// Fisher-Yates shuffle algoritması
const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// İki coğrafi konum arasındaki mesafeyi (km) hesaplayan yardımcı fonksiyon
const getDistance = (loc1: LocationItem | null, loc2: LocationItem | null) => {
    if (!loc1 || !loc2) return Infinity;
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Mapillary resmini yüklemeyi deneyen ve hata durumunda reject eden Promise tabanlı fonksiyon
const loadMapillaryPromise = (
    imageId: string, 
    viewerRef: React.MutableRefObject<any>, 
    mlyContainerRef: React.RefObject<HTMLDivElement> // Hata düzeltildi: Ref'in null olabileceğini kabul et
): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const timeout = 8000;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const cleanupAnd = (action: () => void, reason?: string) => {
            if (timeoutId) clearTimeout(timeoutId);
            if (viewerRef.current) {
                viewerRef.current.off("image", successListener);
            }
            if (reason) reject(new Error(reason));
            action();
        };

        const successListener = () => cleanupAnd(resolve);
        const failure = (reason: string) => cleanupAnd(() => reject(new Error(reason)));

        try {
            const { Viewer } = await import("mapillary-js");
            
            if (mlyContainerRef.current) {
                 if (!viewerRef.current) {
                    viewerRef.current = new Viewer({
                        accessToken: MAPILLARY_TOKEN,
                        container: mlyContainerRef.current,
                        component: { cover: false, marker: true, direction: true },
                    });
                    window.addEventListener("resize", () => viewerRef.current.resize());
                }
                viewerRef.current.on("image", successListener);
                await viewerRef.current.moveTo(imageId);
                timeoutId = setTimeout(() => failure(`Zaman aşımı: ${imageId} yüklenemedi.`), timeout);
            } else {
                failure("Mapillary konteyneri bulunamadı.");
            }
        } catch (e: any) {
            failure(`Mapillary hatası: ${e.message}`);
        }
    });
};


export default function Game({ onGameEnd }: GameProps) {
    const mlyContainerRef = useRef<HTMLDivElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);
    const mapRef = useRef<any>(null);
    const previousTargetLocRef = useRef<LocationItem | null>(null);

    const [locationPool, setLocationPool] = useState<LocationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState("Konumlar hazırlanıyor...");
    const [status, setStatus] = useState<"playing" | "result">("playing");

    const [targetLoc, setTargetLoc] = useState<LocationItem | null>(null);
    const [scoreData, setScoreData] = useState<{ score: number; distance: string } | null>(null);
    const [isMapLarge, setIsMapLarge] = useState(false);

    const [currentRound, setCurrentRound] = useState(0);
    const [sessionScore, setSessionScore] = useState(0);

    useEffect(() => {
        // *** KALICI ÇÖZÜM: API anahtarını en başta kontrol et ***
        if (!MAPILLARY_TOKEN) {
            setLoadingText("Mapillary API anahtarı bulunamadı! Lütfen .env.local dosyanızı kontrol edin.");
            return;
        }

        const fetchLocationsForAreas = async (areas: AreaItem[]): Promise<LocationItem[]> => {
            const promises = areas.map(area => {
                const bbox = area.bbox.join(',');
                const url = `https://graph.mapillary.com/images?access_token=${MAPILLARY_TOKEN}&fields=id,computed_geometry&limit=100&is_pano=true&bbox=${bbox}`;
                return fetch(url).then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status} for area ${area.name}`);
                    return res.json();
                }).then(data => ({ ...data, areaName: area.name }));
            });

            const settledResults = await Promise.allSettled(promises);
            let allLocations: LocationItem[] = [];

            for (const settledResult of settledResults) {
                if (settledResult.status === 'fulfilled') {
                    const result = settledResult.value;
                    if (result.data && result.data.length > 0) {
                        for (const image of result.data) {
                            if (image.computed_geometry && image.computed_geometry.coordinates) {
                                allLocations.push({
                                    id: image.id,
                                    lat: image.computed_geometry.coordinates[1],
                                    lng: image.computed_geometry.coordinates[0],
                                    name: result.areaName,
                                });
                            }
                        }
                    }
                } else {
                    console.warn("Bir bölge için konum çekme başarısız (Reklam engelleyici veya ağ hatası olabilir):", settledResult.reason.message);
                }
            }
            
            const uniqueLocations = Array.from(new Map(allLocations.map(loc => [loc.id, loc])).values());
            
            return uniqueLocations;
        };

        const initializeGame = async () => {
            const areaResponse = await fetch('/countries.json');
            let allAreas: AreaItem[] = await areaResponse.json();
            allAreas = shuffleArray(allAreas);

            setLoadingText(`Konumlar getiriliyor...`);
            const uniquePool = await fetchLocationsForAreas(allAreas);

            if (uniquePool.length < 5) {
                setLoadingText("Hata: Yeterli konum bulunamadı! Lütfen reklam engelleyiciyi kontrol edin veya sayfayı yenileyin.");
                return;
            }

            const finalPool = shuffleArray(uniquePool);
            initGame(finalPool);
        };

        initializeGame().catch(err => {
            console.error("Oyun başlatılırken kritik hata:", err);
            setLoadingText("Bir hata oluştu!");
        });

        return () => {
            if (viewerRef.current) viewerRef.current.remove();
            if (mapRef.current) mapRef.current.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initGame = async (pool: LocationItem[]) => {
        const L = await import("leaflet");
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([20, 0], 2);
            L.control.zoom({ position: 'topleft' }).addTo(map);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(map);

            map.on('click', (e: any) => {
                if (status !== 'playing') return;
                map.eachLayer((layer: any) => {
                    if (layer.options && layer.options.alt === 'user_guess') map.removeLayer(layer);
                });
                L.marker(e.latlng, { alt: 'user_guess' }).addTo(map);
                (window as any).userGuess = e.latlng;
            });

            mapRef.current = map;
            startNewRound(1, pool);
        }
    };

    const tryNextLocation = async (round: number, currentPool: LocationItem[]) => {
        if (currentPool.length === 0) {
            setLoadingText("Oynanacak konum kalmadı, oyun bitiyor!");
            setTimeout(() => onGameEnd(sessionScore), 2000);
            return;
        }

        setLoading(true);
        setLoadingText("Konum doğrulanıyor...");

        const pool = [...currentPool];
        const MIN_DISTANCE = 50;

        const shuffledIndexes = shuffleArray([...pool.keys()]);
        const farIndex = shuffledIndexes.find(i => getDistance(previousTargetLocRef.current, pool[i]) >= MIN_DISTANCE);
        const selectedIndex = farIndex !== undefined ? farIndex : shuffledIndexes[0];
        
        const potentialLoc = pool[selectedIndex];
        const nextPool = pool.filter((_, i) => i !== selectedIndex);

        try {
            await loadMapillaryPromise(potentialLoc.id, viewerRef, mlyContainerRef);
            
            setLoading(false);
            setTargetLoc(potentialLoc);
            setLocationPool(nextPool);
            previousTargetLocRef.current = potentialLoc;

        } catch (error) {
            console.warn(error);
            tryNextLocation(round, nextPool);
        }
    };

    const startNewRound = (round: number, pool: LocationItem[]) => {
        setLoading(true);
        setLoadingText(`Tur ${round} yükleniyor...`);
        setCurrentRound(round);
        setStatus("playing");
        setScoreData(null);
        setIsMapLarge(false);
        (window as any).userGuess = null;

        if (mapRef.current) {
            mapRef.current.eachLayer((layer: any) => { if (!layer._url) mapRef.current.removeLayer(layer); });
            mapRef.current.setView([20, 0], 2);
        }

        tryNextLocation(round, pool);
    };

    const handleGuess = async () => {
        const guess = (window as any).userGuess;
        if (!guess || !targetLoc) {
            alert("Lütfen haritadan bir yer işaretleyin!");
            return;
        }

        const L = await import("leaflet");
        const distanceKm = getDistance({ ...targetLoc, lat: guess.lat, lng: guess.lng }, targetLoc);

        const score = Math.max(0, 5000 - Math.round(distanceKm));
        setScoreData({ distance: distanceKm.toFixed(1), score });
        setSessionScore(prev => prev + score);
        setStatus("result");
        setIsMapLarge(true);

        L.marker([targetLoc.lat, targetLoc.lng]).addTo(mapRef.current).bindPopup(`Doğru Cevap: ${targetLoc.name}`).openPopup();
        L.polyline([[guess.lat, guess.lng], [targetLoc.lat, targetLoc.lng]], { color: 'red', weight: 3, dashArray: '10, 10' }).addTo(mapRef.current);
        const bounds = L.latLngBounds([[guess.lat, guess.lng], [targetLoc.lat, targetLoc.lng]]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    };

    const handleNextRound = () => {
        startNewRound(currentRound + 1, locationPool);
    };

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden">
            {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-400 border-solid mb-4"></div>
                    <p className="text-xl font-bold">{loadingText}</p>
                </div>
            )}

            <div className="absolute top-5 left-5 z-50 glass-effect text-white px-4 py-2 rounded-lg shadow-lg">
                <p>Tur: <span className="font-bold text-lg">{currentRound}</span></p>
                <p>Toplam Puan: <span className="font-bold text-lg text-green-400">{sessionScore.toLocaleString()}</span></p>
            </div>

            {status === "result" && scoreData && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50">
                    <div className="glass-effect text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-bounce">
                        <span className="text-green-400 font-bold text-xl">+{scoreData.score.toLocaleString()} Puan</span>
                        <span className="text-gray-300 text-sm">({scoreData.distance} km)</span>
                        
                        <button onClick={handleNextRound} className="bg-blue-500/50 px-4 py-1 rounded-full text-sm hover:bg-blue-500/80 font-bold transition-all-fast">
                            Sıradaki Tur →
                        </button>
                        
                        <button onClick={() => onGameEnd(sessionScore)} className="bg-red-500/50 px-3 py-1 rounded-full text-xs hover:bg-red-500/80 transition-all-fast">
                            Oyunu Bitir
                        </button>
                    </div>
                </div>
            )}

            <div ref={mlyContainerRef} className="w-full h-full absolute top-0 left-0 z-0" />
            <div className={`absolute z-40 transition-all-fast bg-white/10 backdrop-blur-md p-2 rounded-lg shadow-2xl border border-white/20 ${isMapLarge ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[70vh] md:w-[800px] md:h-[600px]' : 'bottom-5 right-5 w-80 h-64 hover:scale-[1.02]'}`}>
                <button onClick={() => setIsMapLarge(!isMapLarge)} className="absolute top-[-15px] right-[-15px] bg-blue-500 text-white w-12 h-12 rounded-full shadow-lg z-50 hover:bg-blue-600 flex items-center justify-center text-xs font-bold transition-all-fast">
                    {isMapLarge ? 'KÜÇÜLT' : 'BÜYÜT'}
                </button>
                <div ref={mapContainerRef} className="w-full h-full rounded bg-gray-200 cursor-crosshair relative z-10" />
                {status === "playing" && (
                    <button onClick={handleGuess} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white font-bold py-3 px-10 rounded-full shadow-lg hover:bg-green-600 transition-all-fast z-20">
                        TAHMİN ET
                    </button>
                )}
            </div>
        </div>
    );
}
