/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { Warehouse, DeliveryOrder } from '../types';
import { MapPin, Truck, AlertTriangle, Compass, Info, ShieldCheck, X, Navigation, RefreshCw } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

// Google Maps API keys should start with the signature premium prefix 'AIzaSy'
const isGmpKey = (key: string): boolean => {
  if (!key) return false;
  const clean = key.trim().replace(/^["']|["']$/g, '');
  return clean.startsWith('AIzaSy') && clean.length >= 25;
};

const hasValidKey = isGmpKey(API_KEY);

export const DEFAULTS_COORDS: { [id: string]: { lat: number; lng: number } } = {
  'wh-1': { lat: 21.0285, lng: 105.8542 }, // Hanoi Center
  'wh-2': { lat: 20.8449, lng: 106.6881 }, // Hai Phong Port
  'wh-3': { lat: 10.8231, lng: 106.6297 }  // District 9 HCM
};

export function getWarehouseCoordinates(wh: Warehouse): { lat: number; lng: number } {
  if (DEFAULTS_COORDS[wh.id]) {
    return DEFAULTS_COORDS[wh.id];
  }
  // Fallback coords for custom branches distributed across major national hubs in Vietnam
  const seed = wh.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const latOptions = [16.0544, 12.2451, 10.0451, 15.1234, 21.5678, 10.3456];
  const lngOptions = [108.2022, 109.1943, 105.7842, 108.8012, 105.8234, 107.0234];
  return {
    lat: latOptions[seed % latOptions.length],
    lng: lngOptions[seed % lngOptions.length]
  };
}

export const ROAD_POINTS = [
  { id: 'wh-1', x: 70, y: 100, label: 'Kho Hà Nội' },
  { id: 'wh-2', x: 195, y: 65, label: 'Lộ trình Hải Phòng' },
  { id: 'wh-mid1', x: 315, y: 110, label: 'Trạm Tiếp Vận Vinh' },
  { id: 'wh-mid2', x: 435, y: 90, label: 'Trạm Đèo Hải Vân' },
  { id: 'wh-mid3', x: 545, y: 110, label: 'Trạm Nha Trang' },
  { id: 'wh-3', x: 650, y: 125, label: 'Kho Sài Gòn' }
];

export const getWarehousePoint = (whId: string, isFrom: boolean) => {
  if (whId === 'wh-1') return ROAD_POINTS[0];
  if (whId === 'wh-2') return ROAD_POINTS[1];
  if (whId === 'wh-3') return ROAD_POINTS[5];
  return isFrom ? ROAD_POINTS[2] : ROAD_POINTS[4];
};

interface GoogleDeliveryMapProps {
  activeDlv: DeliveryOrder | null;
  warehouses: Warehouse[];
  onCoordUpdate?: (lat: number, lng: number) => void;
}

// Subcomponent to compute directions from origin node to destination node
function RouteDisplay({ 
  origin, 
  destination, 
  progress, 
  onProgressCoordChange 
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  progress: number;
  onProgressCoordChange: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<any[]>([]);
  const lastStateRef = useRef<string>('');

  useEffect(() => {
    if (!routesLib || !map) return;

    const requestKey = `${origin.lat},${origin.lng}_to_${destination.lat},${destination.lng}`;
    if (lastStateRef.current === requestKey) {
      return;
    }
    lastStateRef.current = requestKey;

    // Clear previous direction paths
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    })
    .then(({ routes }) => {
      if (routes && routes[0]) {
        const primaryRoute = routes[0];
        const newPolylines = primaryRoute.createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#3b82f6',
            strokeOpacity: 0.8,
            strokeWeight: 5,
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const fullPath = primaryRoute.path;
        if (fullPath && fullPath.length > 0) {
          const index = Math.min(
            Math.floor((progress / 100) * fullPath.length),
            fullPath.length - 1
          );
          const currentPoint = fullPath[index];
          if (currentPoint) {
            onProgressCoordChange(currentPoint.lat(), currentPoint.lng());
          }
        }
      }
    })
    .catch((err) => {
      console.warn('Google Routes: Sourcing straight vector line fallback: ', err);
      const interpolatedLat = origin.lat + (destination.lat - origin.lat) * (progress / 100);
      const interpolatedLng = origin.lng + (destination.lng - origin.lng) * (progress / 100);
      onProgressCoordChange(interpolatedLat, interpolatedLng);

      const gMaps = (window as any).google?.maps;
      if (gMaps) {
        const pathLine = new gMaps.Polyline({
          path: [origin, destination],
          geodesic: true,
          strokeColor: '#f59e0b',
          strokeOpacity: 0.7,
          strokeWeight: 4,
        });
        pathLine.setMap(map);
        polylinesRef.current = [pathLine];

        const bounds = new gMaps.LatLngBounds();
        bounds.extend(origin);
        bounds.extend(destination);
        map.fitBounds(bounds);
      }
    });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  useEffect(() => {
    if (!routesLib || !map) return;
    if (polylinesRef.current.length > 0) {
      const pl = polylinesRef.current[0];
      const pathArray = pl.getPath()?.getArray();
      if (pathArray && pathArray.length > 0) {
        const index = Math.min(
          Math.floor((progress / 100) * pathArray.length),
          pathArray.length - 1
        );
        const pt = pathArray[index];
        if (pt) {
          onProgressCoordChange(pt.lat(), pt.lng());
        }
        return;
      }
    }
    const interpolatedLat = origin.lat + (destination.lat - origin.lat) * (progress / 100);
    const interpolatedLng = origin.lng + (destination.lng - origin.lng) * (progress / 100);
    onProgressCoordChange(interpolatedLat, interpolatedLng);
  }, [progress, origin, destination]);

  return null;
}

// Marker item component that holds its own info window trigger state
function WarehouseMarker({ 
  wh, 
  position, 
  isOrigin, 
  isDest 
}: { 
  wh: Warehouse; 
  position: { lat: number; lng: number }; 
  isOrigin: boolean; 
  isDest: boolean; 
  key?: React.Key;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  let pinBg = '#3b82f6';
  let glyphText = '🏢';
  if (isOrigin) {
    pinBg = '#10b981';
    glyphText = '📤';
  } else if (isDest) {
    pinBg = '#ef4444';
    glyphText = '📥';
  }

  return (
    <>
      <AdvancedMarker 
        ref={markerRef} 
        position={position} 
        onClick={() => setOpen(true)}
        title={wh.name}
      >
        <Pin background={pinBg} glyphText={glyphText} borderColor="#ffffff" scale={1.1} />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-1 max-w-[220px]">
            <h5 className="font-bold text-slate-900 text-xs">{wh.name}</h5>
            <p className="text-slate-500 text-[10px] mt-0.5">{wh.location}</p>
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex justify-between items-center text-[10px]">
              <span className="text-slate-400">ID Chi nhánh:</span>
              <span className="font-mono bg-slate-100 px-1 rounded font-bold text-slate-700">{wh.id}</span>
            </div>
            {isOrigin && (
              <span className="inline-block mt-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 p-0.5 px-1.5 rounded">
                Điểm bốc hàng nguồn
              </span>
            )}
            {isDest && (
              <span className="inline-block mt-1 text-[9px] font-bold bg-red-500/10 text-red-600 p-0.5 px-1.5 rounded">
                Điểm tiếp nhận bến đích
              </span>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export default function GoogleDeliveryMap({ activeDlv, warehouses, onCoordUpdate }: GoogleDeliveryMapProps) {
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [truckRef, truckMarker] = useAdvancedMarkerRef();
  const [isTruckOpen, setIsTruckOpen] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // If there is no valid key, we render a highly interactive Vector Map
  if (!hasValidKey) {
    // Interpolate truck position along the vector route
    let truckX = 360;
    let truckY = 100;
    let fromWhName = 'Kho Gửi';
    let toWhName = 'Kho Nhận';

    if (activeDlv) {
      const startPt = getWarehousePoint(activeDlv.fromWarehouseId, true);
      const endPt = getWarehousePoint(activeDlv.toWarehouseId, false);
      fromWhName = warehouses.find(w => w.id === activeDlv.fromWarehouseId)?.name || 'Kho Gửi';
      toWhName = warehouses.find(w => w.id === activeDlv.toWarehouseId)?.name || 'Kho Nhận';
      const progressDec = (activeDlv.routeProgress || 0) / 100;
      truckX = startPt.x + (endPt.x - startPt.x) * progressDec;
      truckY = startPt.y + (endPt.y - startPt.y) * progressDec;
    }

    return (
      <div className="flex flex-col gap-3">
        {/* Beautiful vector canvas map */}
        <div className="relative w-full h-[220px] bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto flex items-center justify-center p-2 shadow-inner">
          <svg className="w-full h-full min-w-[620px]" viewBox="0 0 720 180" style={{ pointerEvents: 'auto' }}>
            {/* Grid lines background */}
            <g opacity="0.08">
              <line x1="0" y1="40" x2="720" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="0" y1="90" x2="720" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="0" y1="140" x2="720" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="100" y1="0" x2="100" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="220" y1="0" x2="220" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="340" y1="0" x2="340" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="460" y1="0" x2="460" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="580" y1="0" x2="580" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
            </g>

            {/* Simulated Road route */}
            <path 
              d="M 70 100 Q 195 65 315 110 T 545 110 T 650 125" 
              fill="none" 
              stroke="#1e293b" 
              strokeWidth="6" 
            />
            <path 
              d="M 70 100 Q 195 65 315 110 T 545 110 T 650 125" 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="3.5" 
              strokeDasharray="4,4"
            />

            {/* Warehouse Points */}
            {ROAD_POINTS.map((pt) => {
              const matchesWarehouse = warehouses.some(w => w.id === pt.id);
              const isSource = activeDlv?.fromWarehouseId === pt.id;
              const isDest = activeDlv?.toWarehouseId === pt.id;
              const isHighlighted = isSource || isDest;

              return (
                <g 
                  key={pt.id} 
                  className="cursor-pointer group"
                  onClick={() => setActiveMarkerId(activeMarkerId === pt.id ? null : pt.id)}
                >
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={isHighlighted ? "8" : "5.5"} 
                    fill={isSource ? "#10b981" : isDest ? "#ef4444" : "#475569"} 
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className={isHighlighted ? "animate-pulse" : "group-hover:fill-blue-405"}
                  />
                  <text 
                    x={pt.x} 
                    y={pt.y - 14} 
                    textAnchor="middle" 
                    fontSize="9.5" 
                    fontWeight={isHighlighted ? "bold" : "normal"}
                    className={`${isHighlighted ? "fill-white" : "fill-slate-400"} font-sans select-none pointer-events-none`}
                  >
                    {isSource ? `[Nguồn] ${fromWhName.slice(0, 15)}` : isDest ? `[Đích] ${toWhName.slice(0, 15)}` : pt.label}
                  </text>
                </g>
              );
            })}

            {/* Simulated Dynamic Truck */}
            {activeDlv && activeDlv.gpsStatus !== 'SIGNAL_LOST' && (
              <g 
                transform={`translate(${truckX - 12}, ${truckY - 12})`} 
                className="transition-all duration-300 cursor-pointer"
                onClick={() => setIsTruckOpen(!isTruckOpen)}
              >
                <circle cx="12" cy="12" r="14" fill="#3b82f6" opacity="0.35" className="animate-ping" style={{ transformOrigin: 'center' }} />
                <circle cx="12" cy="12" r="10.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <path 
                  d="M 12 7 L 15 14 L 12 12.5 L 9 14 Z" 
                  fill="#ffffff"
                  transform={`rotate(${activeDlv.routeProgress >= 100 ? 90 : 45}, 12, 12)`}
                />
              </g>
            )}
          </svg>

          {/* Floating interactive node metadata overlay */}
          {activeDlv && (
            <div className="absolute top-2.5 left-2.5 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-[10.5px] font-mono text-slate-350 space-y-1 select-none pointer-events-none">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Truck className="h-3 w-3" />
                <span>Tuyển bến: {activeDlv.code}</span>
              </div>
              <div>Vị trí ảo: <span className="text-amber-400">{activeDlv.latitude.toFixed(4)}N, {activeDlv.longitude.toFixed(4)}E</span></div>
              <div>Hành trình: <span className="text-emerald-400">{activeDlv.routeProgress}% Hoàn tất</span></div>
            </div>
          )}

          {/* Interactive Node Info Box */}
          {activeMarkerId && (() => {
            const pt = ROAD_POINTS.find(p => p.id === activeMarkerId);
            const wh = warehouses.find(w => w.id === activeMarkerId);
            if (!pt) return null;
            return (
              <div className="absolute bottom-2.5 left-2.5 bg-slate-900/95 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 text-xs text-white max-w-[200px] shadow-xl">
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="font-bold text-blue-400 text-[11px] uppercase tracking-wider">Thông tin trạm</span>
                  <button type="button" onClick={() => setActiveMarkerId(null)} className="text-slate-400 hover:text-white cursor-pointer p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="font-bold font-sans text-slate-100">{wh?.name || pt.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{wh?.location || 'Trạm tiếp quản nội địa hoặc hải cảng trung chuyển.'}</p>
              </div>
            );
          })()}

          {/* Interactive Truck Info Box */}
          {activeDlv && isTruckOpen && (
            <div className="absolute bottom-2.5 right-2.5 bg-slate-900/95 backdrop-blur-md p-3 rounded-lg border border-slate-800 text-xs text-white max-w-[210px] shadow-xl animate-fade-in">
              <div className="flex justify-between items-center gap-3 mb-1.5 border-b border-slate-800 pb-1">
                <div className="flex items-center gap-1 text-blue-400 font-bold">
                  <Truck className="h-3 w-3" />
                  <span>Chuyến xe: {activeDlv.code}</span>
                </div>
                <button type="button" onClick={() => setIsTruckOpen(false)} className="text-slate-400 hover:text-white cursor-pointer p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="font-bold text-slate-100">{activeDlv.driverName}</p>
              <p className="text-[10px] text-slate-400">{activeDlv.driverPhone}</p>
              <div className="text-[10px] text-slate-300 mt-1.5 space-y-0.5 font-mono">
                <div>Biển số: {activeDlv.vehiclePlate}</div>
                <div>Tốc độ: 60 km/h</div>
                <div className="truncate">Vị trí: {activeDlv.currentLocationName || 'Đang di chuyển'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Small educational upgrade banner */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-450 font-sans flex items-center gap-2">
              <Compass className="h-3.5 w-3.5 text-blue-500 animate-spin-slow" />
              <span>Sơ đồ Vector nội bộ đang chạy ở chế độ ngoại tuyến bảo mật.</span>
            </span>
            <button 
              type="button" 
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="text-[10.5px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Info className="h-3.5 w-3.5" />
              <span>{showSetupGuide ? 'Đóng hướng dẫn' : 'Nâng cấp Google Maps'}</span>
            </button>
          </div>

          {showSetupGuide && (
            <div className="text-xs text-slate-300 border-t border-slate-850 pt-2.5 space-y-2 mt-1 font-sans animate-fade-in">
              <p className="font-bold text-amber-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Cách thức kết hợp Google Maps vệ tinh vô cùng đơn giản:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-350 pr-2 leading-relaxed">
                <li>
                  Truy cập <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-bold hover:text-blue-350">Cloud Console Google Maps</a> để nhận API Key miễn phí.
                </li>
                <li>
                  Bấm vào biểu tượng <strong className="text-white">Settings (⚙️ biểu tượng bánh răng lớn ở góc trên cùng bên phải)</strong>.
                </li>
                <li>
                  Chọn thẻ <strong className="text-white">Secrets</strong> &rarr; Nhập tên khoá là <code className="bg-slate-800 px-1 py-0.5 rounded text-yellow-400 font-mono">GOOGLE_MAPS_PLATFORM_KEY</code> &rarr; Nhập dán giá trị API Key vừa nhận được của bạn vào và ấn <strong className="text-white">Enter</strong>.
                </li>
              </ol>
              <p className="text-[10px] text-slate-450 border-t border-slate-850 pt-1.5 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Dự án sẽ tự động nạp lại và bật bản đồ vệ tinh ngay lập tức sau khi cấu hình API Key.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Google Maps Mode (When hasValidKey is True)
  let defaultCenter = { lat: 16.0544, lng: 108.2022 }; // Da Nang (mid Vietnam)
  if (activeDlv) {
    defaultCenter = { lat: activeDlv.latitude, lng: activeDlv.longitude };
  }

  const handleTruckCoordChange = (lat: number, lng: number) => {
    if (onCoordUpdate) {
      onCoordUpdate(lat, lng);
    }
  };

  const currentTruckPos = activeDlv ? { lat: activeDlv.latitude, lng: activeDlv.longitude } : null;

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={activeDlv ? 6 : 5}
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '380px' }}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {/* Render all existing warehouses on Google Map */}
          {warehouses.map(w => {
            const coords = getWarehouseCoordinates(w);
            const isOrigin = activeDlv?.fromWarehouseId === w.id;
            const isDest = activeDlv?.toWarehouseId === w.id;

            return (
              <WarehouseMarker 
                key={w.id} 
                wh={w} 
                position={coords} 
                isOrigin={isOrigin} 
                isDest={isDest} 
              />
            );
          })}

          {/* Compute and draw driving Directions + update truck dynamic state */}
          {activeDlv && (() => {
            const startWh = warehouses.find(w => w.id === activeDlv.fromWarehouseId);
            const endWh = warehouses.find(w => w.id === activeDlv.toWarehouseId);
            if (!startWh || !endWh) return null;

            const originCoords = getWarehouseCoordinates(startWh);
            const destCoords = getWarehouseCoordinates(endWh);

            return (
              <RouteDisplay 
                origin={originCoords} 
                destination={destCoords} 
                progress={activeDlv.routeProgress} 
                onProgressCoordChange={handleTruckCoordChange}
              />
            );
          })()}

          {/* Render Delivery Driver Truck Marker */}
          {activeDlv && currentTruckPos && activeDlv.gpsStatus !== 'SIGNAL_LOST' && (
            <>
              <AdvancedMarker 
                ref={truckRef}
                position={currentTruckPos} 
                onClick={() => setIsTruckOpen(true)}
                title={`Xe: ${activeDlv.vehiclePlate}`}
              >
                {/* Custom animated Truck layout container */}
                <div style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '100%',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '2px solid #ffffff',
                  cursor: 'pointer'
                }}>
                  <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-25" style={{ transformScale: 1.3 }}></div>
                  <Truck className="h-5 w-5" />
                </div>
              </AdvancedMarker>

              {isTruckOpen && (
                <InfoWindow anchor={truckMarker} onCloseClick={() => setIsTruckOpen(false)}>
                  <div className="p-1 max-w-[200px] text-xs font-sans">
                    <div className="font-bold flex items-center gap-1.5 text-blue-600">
                      <Truck className="h-3 w-3" />
                      <span>Đơn Xe {activeDlv.code}</span>
                    </div>
                    <p className="font-bold text-slate-800 mt-1">{activeDlv.driverName}</p>
                    <p className="text-[10px] text-slate-500">{activeDlv.driverPhone}</p>
                    <div className="mt-2 border-t pt-1.5 space-y-1 text-[10px] text-slate-600">
                      <div>Biển số: <strong className="text-slate-800">{activeDlv.vehiclePlate}</strong></div>
                      <div>Vận tốc: <strong className="text-emerald-605 font-bold">65 km/h</strong></div>
                      <div>Tiến độ: <strong className="text-blue-600">{activeDlv.routeProgress}%</strong></div>
                      <div className="truncate">Vị trí: <span>{activeDlv.currentLocationName || 'Đang di chuyển'}</span></div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
