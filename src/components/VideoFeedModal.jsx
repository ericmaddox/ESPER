import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RefreshCw, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Video, Image as ImageIcon } from 'lucide-react';
import Hls from 'hls.js';

export default function VideoFeedModal({ camera, onClose }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);
  const [posterKey, setPosterKey] = useState(Date.now());
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!camera || !videoRef.current) return;
    const video = videoRef.current;
    const url = camera.videoUrl;
    setStreamFailed(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (url && (url.endsWith('.m3u8') || url.includes('.m3u8'))) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          manifestLoadingTimeOut: 5000,
          manifestLoadingMaxRetry: 2
        });
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('HLS stream failed, switching to live image fallback:', data);
            setStreamFailed(true);
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.play().catch(() => {});
      }
    } else if (url) {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [camera]);

  if (!camera) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handlePan = (dx, dy) => {
    setPanX(prev => Math.min(Math.max(prev + dx, -40), 40));
    setPanY(prev => Math.min(Math.max(prev + dy, -40), 40));
  };

  const resetPtz = () => {
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
  };

  const refreshPoster = () => {
    setPosterKey(Date.now());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-xl overflow-hidden border border-cyan-500/40 shadow-2xl flex flex-col">
        
        {/* Header Bar */}
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-100 uppercase truncate max-w-md">
              {camera.id}: {camera.name}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
              ● {camera.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport Area */}
        <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
          {streamFailed && camera.posterUrl ? (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img
                key={posterKey}
                src={`${camera.posterUrl}&t=${posterKey}`}
                alt={camera.name}
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`
                }}
              />
              <div className="absolute top-2 right-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded text-[10px] font-mono flex items-center space-x-1">
                <ImageIcon className="w-3 h-3" />
                <span>LIVE SNAPSHOT REFRESH</span>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              poster={camera.posterUrl}
              autoPlay
              loop
              muted
              playsInline
              onError={() => setStreamFailed(true)}
              className="w-full h-full object-cover transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`
              }}
            />
          )}

          {/* Tactical HUD Overlay on Video */}
          <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between font-mono text-[10px] text-cyan-400">
            <div className="flex justify-between items-start">
              <div className="space-y-0.5 bg-slate-950/70 p-2 rounded border border-cyan-500/20 backdrop-blur max-w-sm">
                <div className="text-white font-bold truncate">{camera.name}</div>
                <div>LAT: <span className="text-white">{camera.latitude != null ? camera.latitude.toFixed(4) : '34.0522'}</span> | LNG: <span className="text-white">{camera.longitude != null ? camera.longitude.toFixed(4) : '-118.2437'}</span></div>
                <div className="text-slate-300 truncate">NETWORK: {camera.network}</div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded border border-cyan-500/20 backdrop-blur text-right">
                <div className="text-emerald-400 font-bold">{streamFailed ? 'LIVE SNAPSHOT' : 'LIVE HLS STREAM'}</div>
                <div className="text-slate-300">CALTRANS D7 DOT</div>
              </div>
            </div>

            {/* Center Target Crosshair */}
            <div className="self-center w-12 h-12 border border-cyan-400/30 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            </div>

            <div className="flex justify-between items-end">
              <div className="bg-slate-950/70 px-2 py-1 rounded border border-cyan-500/20">
                STATUS: <span className="text-emerald-400 font-bold">ONLINE</span>
              </div>
              <div className="bg-slate-950/70 px-2 py-1 rounded border border-cyan-500/20">
                ZOOM: <span className="text-slate-200 font-bold">{zoomLevel.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & PTZ Camera Controls */}
        <div className="p-3 bg-slate-900/90 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            {!streamFailed ? (
              <button
                onClick={togglePlay}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={refreshPoster}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors flex items-center space-x-1"
                title="Refresh Snapshot"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <span className="text-slate-400 text-[11px]">
              {streamFailed ? 'FEED: CALTRANS LIVE SNAPSHOT' : 'FORMAT: CALTRANS HLS STREAM'}
            </span>
          </div>

          {/* PTZ Pad */}
          <div className="flex items-center space-x-3">
            <span className="text-[10px] text-slate-400 uppercase">PTZ CONTROLS:</span>
            
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded border border-slate-800">
              <div></div>
              <button onClick={() => handlePan(0, 10)} className="p-1 hover:bg-slate-800 text-cyan-400 rounded"><ArrowUp className="w-3 h-3" /></button>
              <div></div>
              <button onClick={() => handlePan(10, 0)} className="p-1 hover:bg-slate-800 text-cyan-400 rounded"><ArrowLeft className="w-3 h-3" /></button>
              <button onClick={resetPtz} className="p-1 hover:bg-slate-800 text-slate-400 rounded" title="Reset PTZ"><RefreshCw className="w-3 h-3" /></button>
              <button onClick={() => handlePan(-10, 0)} className="p-1 hover:bg-slate-800 text-cyan-400 rounded"><ArrowRight className="w-3 h-3" /></button>
              <div></div>
              <button onClick={() => handlePan(0, -10)} className="p-1 hover:bg-slate-800 text-cyan-400 rounded"><ArrowDown className="w-3 h-3" /></button>
              <div></div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 3))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 font-bold transition-all"
          >
            CLOSE STREAM
          </button>
        </div>

      </div>
    </div>
  );
}
