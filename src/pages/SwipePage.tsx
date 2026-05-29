import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Check,
  Waves,
  MapPin,
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  Info,
  Instagram,
  Twitter,
  ExternalLink,
  User as UserIcon,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useStore } from "../lib/Store";
import { getAssetUrl, API_BASE } from "../lib/constants";

const USER_PLACEHOLDER =
  "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=400";
const PARTY_PLACEHOLDER =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000";

export function SwipePage() {
  const {
    feed,
    user,
    sendSocketMessage,
    removeFromFeed,
    coords,
    refreshLocation,
    chats,
    addLocalChat,
  } = useStore();
  const navigate = useNavigate();
  const [swipeDir, setSwipeDir] = useState<{
    [key: string]: "left" | "right" | null;
  }>({});
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [currentPartyPhotoIndex, setCurrentPartyPhotoIndex] = useState(0);
  const [currentUserPhotoIndex, setCurrentUserPhotoIndex] = useState(0);
  const [cardPhotoIndices, setCardPhotoIndices] = useState<Record<string, number>>({});

  const getDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const handleUserClick = async (userId: string) => {
    if (userId === user?.ID) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentUserPhotoIndex(0);
        setSelectedUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDMWithUserId = async (targetUserId: string, targetName?: string, targetThumbnail?: string) => {
    if (!user || !targetUserId) return;
    if (targetUserId === user.ID) return;

    // check if we already have a DM with this user
    const existingChat = chats.find(
      (c) =>
        !c.IsGroup &&
        c.ParticipantIDs?.includes(user.ID) &&
        c.ParticipantIDs?.includes(targetUserId),
    );

    if (existingChat) {
      setSelectedUser(null);
      setSelectedParty(null);
      navigate(`/chat/${existingChat.ID}`);
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/chats/dm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceUserId: user.ID,
            targetUserId: targetUserId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ChatID) {
            // Register new chat room instantly in client store
            addLocalChat({
              ID: data.ChatID,
              PartyID: "DM",
              Title: `${user.RealName} & ${targetName || "Host"}`,
              ImageUrl: targetThumbnail || "",
              RecentMessages: [],
              IsGroup: false,
              ParticipantIDs: [user.ID, targetUserId]
            });
            sendSocketMessage("GET_CHATS", {});
            setSelectedUser(null);
            setSelectedParty(null);
            navigate(`/chat/${data.ChatID}`);
          }
        }
      } catch (err) {
        console.error("Failed to create DM via POST:", err);
      }
    }
  };

  const handleDM = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedUser) return;
    await handleDMWithUserId(selectedUser.ID, selectedUser.RealName, selectedUser.Thumbnail);
  };

  useEffect(() => {
    refreshLocation((newCoords) => {
      sendSocketMessage("GET_FEED", {
        Lat: newCoords.lat,
        Lon: newCoords.lon,
        RadiusKm: 50,
      });
    });

    // Fallback if location prompt is ignored/slow
    if (!coords) {
      sendSocketMessage("GET_FEED", { Lat: 0, Lon: 0 });
    }
  }, []);

  const swipeFeed = feed.filter((p) => p.HostID !== user?.ID);
  const activeIndex = swipeFeed.length - 1;

  const handleSwipe = (dir: "left" | "right", partyId: string) => {
    setSwipeDir((prev) => ({ ...prev, [partyId]: dir }));
    sendSocketMessage("SWIPE", {
      PartyID: partyId,
      Direction: dir,
    });

    // Remove from feed immediately, allowing AnimatePresence to run
    setTimeout(() => {
      removeFromFeed(partyId);
    }, 10);
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-[#050505] overflow-hidden">
      {/* Header - Floating over the cards */}
      <header className="absolute top-0 left-0 right-0 px-6 pt-8 pb-4 flex justify-between items-center z-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="text-2xl font-black bg-gradient-to-r from-brand-primary to-brand-secondary text-transparent bg-clip-text tracking-tighter pointer-events-auto">
          WaterParty
        </div>
        <div className="bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white/70 tracking-wide flex items-center gap-1 pointer-events-auto border border-white/5">
          <Waves size={14} className="text-brand-accent" />{" "}
          <span className="mt-0.5 uppercase">Nearby</span>
        </div>
      </header>

      {/* Cards Container */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full overflow-hidden flex flex-col">
          {swipeFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in zoom-in duration-500">
              <Waves size={48} className="text-brand-accent opacity-80" />
              <div className="text-center">
                <h2 className="text-lg tracking-[0.2em] font-light text-white/50 uppercase">
                  Silence
                </h2>
                <p className="text-xs text-white/30 tracking-widest uppercase mt-1">
                  No parties nearby
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {swipeFeed.map((party, index) => {
                const isTop = index === activeIndex;
                const currentIdx = cardPhotoIndices[party.ID] || 0;
                const photos = party.PartyPhotos && party.PartyPhotos.length > 0 ? party.PartyPhotos : [];
                const displayImage =
                  photos.length > 0
                    ? getAssetUrl(photos[currentIdx] || photos[0])
                    : party.Thumbnail
                      ? getAssetUrl(party.Thumbnail)
                      : PARTY_PLACEHOLDER;

                const date = party.StartTime
                  ? new Date(party.StartTime)
                  : new Date();

                const now = new Date();
                const diffMs = date.getTime() - now.getTime();
                let dateStr = "";
                if (diffMs < 0 && diffMs > -4 * 3600 * 1000) {
                  dateStr = "HAPPENING NOW";
                } else if (diffMs < 0) {
                  dateStr = "ENDED";
                } else {
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffDays = Math.floor(diffHours / 24);
                  if (diffDays > 0) {
                    dateStr = `IN ${diffDays} DAY${diffDays > 1 ? "S" : ""}`;
                  } else if (diffHours > 0) {
                    dateStr = `IN ${diffHours} HOUR${diffHours > 1 ? "S" : ""}`;
                  } else {
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    dateStr = `IN ${diffMins} MIN${diffMins > 1 ? "S" : ""}`;
                  }
                }

                const exitX =
                  swipeDir[party.ID] === "left"
                    ? -300
                    : swipeDir[party.ID] === "right"
                      ? 300
                      : 0;
                const exitRotate =
                  swipeDir[party.ID] === "left"
                    ? -15
                    : swipeDir[party.ID] === "right"
                      ? 15
                      : 0;

                 return (
                  <motion.div
                    key={party.ID}
                    className={cn(
                      "absolute inset-0 overflow-hidden bg-[#050505]",
                      !isTop && "pointer-events-none",
                    )}
                    style={{
                      zIndex: index,
                    }}
                    initial={{ scale: 0.95, y: 20, opacity: 0 }}
                    animate={{
                      scale: isTop ? 1 : 0.95 - (swipeFeed.length - 1 - index) * 0.05,
                      y: isTop ? 0 : (swipeFeed.length - 1 - index) * 15,
                      opacity: 1,
                    }}
                    exit={{
                      x: exitX,
                      y: Math.random() * 100 - 50,
                      opacity: 0,
                      rotate: exitRotate,
                      transition: { duration: 0.3, ease: "easeOut" },
                    }}
                    drag={isTop ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(e, { offset, velocity }) => {
                      const swipeThreshold = 100;
                      if (offset.x > swipeThreshold || velocity.x > 500) {
                        handleSwipe("right", party.ID);
                      } else if (
                        offset.x < -swipeThreshold ||
                        velocity.x < -500
                      ) {
                        handleSwipe("left", party.ID);
                      }
                    }}
                  >
                    <div
                      className="absolute inset-0 bg-[#111] z-0 pointer-events-none"
                    >
                      <img
                        src={displayImage}
                        alt={party.Title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-30 pointer-events-none" />
                      
                      {/* Carousel Indicators for Main Swipe Card */}
                      {isTop && photos.length > 1 && (
                        <div className="absolute top-4 inset-x-0 flex justify-center gap-1.5 z-20 px-4 pointer-events-none">
                          {photos.map((_, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "h-1 rounded-full flex-1 transition-all",
                                idx === currentIdx ? "bg-white" : "bg-white/30"
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"
                      style={{
                        paddingBottom: "148px",
                        marginTop: "0px",
                        marginBottom: "0px"
                      }}
                    >
                      <div className="flex items-center space-x-2 mb-3 pointer-events-none">
                        <span className="px-2.5 py-1 bg-white/10 backdrop-blur-xl rounded-lg text-[9px] font-black text-brand-accent border border-white/5 flex items-center shadow-lg">
                          ⏳ {dateStr}
                        </span>
                        <span className="px-2.5 py-1 bg-white/5 backdrop-blur-xl rounded-lg text-[9px] font-black text-white/50 border border-white/5 uppercase">
                          {party.City || "Unknown"}
                        </span>
                        {coords && party.GeoLat && party.GeoLon && (
                          <span className="px-2.5 py-1 bg-white/5 backdrop-blur-xl rounded-lg text-[9px] font-black text-brand-accent border border-white/5 uppercase">
                            {getDistance(
                              coords.lat,
                              coords.lon,
                              party.GeoLat,
                              party.GeoLon,
                            )}{" "}
                            KM
                          </span>
                        )}
                      </div>
                      <h2 className="text-3xl font-black text-white leading-[0.8] mb-4 drop-shadow-2xl uppercase tracking-tighter pointer-events-none">
                        {party.Title}
                      </h2>
                      <div className="flex items-center gap-3 mb-6 relative">
                        <div
                          className="flex items-center gap-3 cursor-pointer group pointer-events-auto"
                          onClick={(e) => {
                            if (!isTop) return;
                            e.stopPropagation();
                            handleUserClick(party.HostID);
                          }}
                        >
                          <img
                            src={
                              party.HostThumbnail
                                ? getAssetUrl(party.HostThumbnail)
                                : USER_PLACEHOLDER
                            }
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#00FFA3] shadow-[0_0_15px_rgba(0,255,163,0.4)] group-hover:scale-110 transition-transform"
                            alt="Host Thumbnail"
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">
                              Hosted By
                            </span>
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                              {(!party.HostName || party.HostName.toLowerCase() === "unknown") ? "The Stellar Foundation" : party.HostName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pointer-events-none">
                        {party.VibeTags?.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-md text-[8px] font-black text-white/60 uppercase tracking-widest border border-white/5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Touch Zones for Carousel and Modal */}
                    {isTop && (
                      <>
                        {/* Left Carousel Nav */}
                        <div 
                          className="absolute top-0 left-0 bottom-[150px] w-1/3 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (photos.length > 1) {
                               setCardPhotoIndices(prev => ({...prev, [party.ID]: Math.max(0, (prev[party.ID] || 0) - 1)}));
                            } else {
                               setCurrentPartyPhotoIndex(currentIdx);
                               setSelectedParty(party);
                            }
                          }}
                        />
                        {/* Center Modal Area */}
                        <div 
                          className="absolute top-0 left-1/3 right-1/3 bottom-[150px] z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPartyPhotoIndex(currentIdx);
                            setSelectedParty(party);
                          }}
                        />
                        {/* Right Carousel Nav */}
                        <div 
                          className="absolute top-0 right-0 bottom-[150px] w-1/3 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (photos.length > 1) {
                               setCardPhotoIndices(prev => ({...prev, [party.ID]: Math.min(photos.length - 1, (prev[party.ID] || 0) + 1)}));
                            } else {
                               setCurrentPartyPhotoIndex(currentIdx);
                               setSelectedParty(party);
                            }
                          }}
                        />
                        
                        {/* Bottom Info Click Area to OPEN MODAL */}
                        <div 
                          className="absolute bottom-[0px] left-0 right-0 h-[150px] z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPartyPhotoIndex(currentIdx);
                            setSelectedParty(party);
                          }}
                        />
                      </>
                    )}

                    {/* Move action buttons inside the card to overlay directly like Tinder */}
                    {isTop && (
                      <div className="absolute bottom-[72px] inset-x-0 flex justify-center items-center gap-6 z-20 pointer-events-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwipe("left", party.ID);
                          }}
                          className="w-16 h-16 flex flex-shrink-0 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-brand-primary/50 text-brand-primary hover:bg-brand-primary hover:text-white active:scale-90 transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                          aria-label="Pass"
                        >
                          <X size={32} strokeWidth={3} className="text-current" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwipe("right", party.ID);
                          }}
                          className="w-16 h-16 flex flex-shrink-0 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-[#00FFA3]/50 text-[#00FFA3] hover:bg-[#00FFA3] hover:text-black active:scale-90 transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                          aria-label="Like"
                        >
                          <Check
                            size={32}
                            strokeWidth={3}
                            className="text-current"
                          />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Party Detail Overlay */}
      <AnimatePresence>
        {selectedParty && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[50] flex items-center justify-center overflow-hidden bg-black"
          >
            <div className="w-full h-full bg-[#0A0B14] overflow-y-auto scrollbar-hide flex flex-col relative">
              <div
                className="relative h-[75dvh] w-full overflow-hidden shrink-0 cursor-pointer"
                onClick={(e) => {
                  if (selectedParty?.PartyPhotos?.length > 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x < rect.width / 2) {
                       setCurrentPartyPhotoIndex(
                         (prev) => Math.max(0, prev - 1),
                       );
                    } else {
                       setCurrentPartyPhotoIndex(
                         (prev) => Math.min(selectedParty.PartyPhotos.length - 1, prev + 1),
                       );
                    }
                  }
                }}
              >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentPartyPhotoIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={
                    getAssetUrl(
                      selectedParty.PartyPhotos?.[currentPartyPhotoIndex] ||
                        selectedParty.Thumbnail ||
                        "",
                    ) || PARTY_PLACEHOLDER
                  }
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Progress Bar Indicators at Top */}
              {selectedParty?.PartyPhotos?.length > 1 && (
                <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-20">
                  {selectedParty.PartyPhotos.map((_: any, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        i === currentPartyPhotoIndex
                          ? "bg-brand-accent shadow-[0_0_8px_rgba(0,210,255,0.6)]"
                          : "bg-white/20",
                      )}
                    />
                  ))}
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-[#0A0B14]/40 to-transparent pointer-events-none" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedParty(null);
                }}
                className="absolute top-8 left-6 w-10 h-10 z-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="absolute bottom-6 left-8 right-8 pointer-events-none">
                <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-2 drop-shadow-lg leading-tight">
                  {selectedParty.Title}
                </h2>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FFA3] inline-block shadow-[0_0_8px_rgba(0,255,163,0.8)]" />
                  <p className="text-sm font-bold text-white uppercase tracking-widest drop-shadow-md">
                    Host •{" "}
                    {(!selectedParty.HostName || selectedParty.HostName.toLowerCase() === "unknown") ? "The Stellar Foundation" : selectedParty.HostName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedParty.VibeTags?.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 pb-32 space-y-4 flex-1">
              {selectedParty.Description && (
                <div>
                  <h4 className="text-[10px] font-black text-white/20 tracking-[0.2em] uppercase mb-1.5">
                    About
                  </h4>
                  <p className="text-sm font-medium text-white/70 leading-relaxed tracking-tight">
                    {selectedParty.Description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                  <Calendar className="text-brand-accent mb-1.5" size={16} />
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                    Date
                  </p>
                  <p className="text-xs font-bold text-white uppercase">
                    {selectedParty.StartTime
                      ? new Date(selectedParty.StartTime).toLocaleDateString(
                          [],
                          { weekday: "short", month: "short", day: "numeric" },
                        )
                      : "TBD"}
                  </p>
                </div>
                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                  <MapPin className="text-brand-accent mb-1.5" size={16} />
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                    City
                  </p>
                  <p className="text-xs font-bold text-white uppercase">
                    {selectedParty.City || "LOCATION TBD"}
                  </p>
                </div>
                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                  <Users className="text-brand-accent mb-1.5" size={16} />
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                    Capacity
                  </p>
                  <p className="text-xs font-bold text-white uppercase tracking-tight">
                    {selectedParty.CurrentGuestCount || 0} /{" "}
                    {selectedParty.MaxCapacity || 300} MAX
                  </p>
                </div>
                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                  <Clock className="text-brand-accent mb-1.5" size={16} />
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                    Time
                  </p>
                  <p className="text-xs font-bold text-white uppercase">
                    {selectedParty.StartTime
                      ? new Date(selectedParty.StartTime).toLocaleTimeString(
                          [],
                          { hour: "2-digit", minute: "2-digit" },
                        )
                      : "TBD"}
                  </p>
                </div>
              </div>

              <div
                onClick={() => handleUserClick(selectedParty.HostID)}
                className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors active:scale-95"
              >
                <img
                  src={
                    selectedParty.HostThumbnail
                      ? getAssetUrl(selectedParty.HostThumbnail)
                      : USER_PLACEHOLDER
                  }
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#00FFA3]"
                />
                <div>
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-0.5">
                    Hosted By
                  </p>
                  <p className="text-sm font-bold text-white tracking-tight">
                    {(!selectedParty.HostName || selectedParty.HostName.toLowerCase() === "unknown") ? "The Stellar Foundation" : selectedParty.HostName}
                  </p>
                </div>
                <ChevronLeft
                  size={16}
                  className="text-white/20 ml-auto rotate-180"
                />
              </div>
            </div>
           </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile Overlay */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="absolute inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black"
          >
            <div className="w-full h-full bg-[#0A0B14] overflow-y-auto scrollbar-hide flex flex-col relative">
              <div
                className="relative h-[550px] w-full overflow-hidden shrink-0 cursor-pointer"
                onClick={(e) => {
                  const photos =
                    Array.isArray(selectedUser.ProfilePhotos) &&
                    selectedUser.ProfilePhotos.length > 0
                      ? selectedUser.ProfilePhotos
                      : ([selectedUser.Thumbnail].filter(Boolean) as string[]);
                  if (photos.length > 1) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    if (x < rect.width / 2) {
                       setCurrentUserPhotoIndex(
                         (prev) => Math.max(0, prev - 1),
                       );
                    } else {
                       setCurrentUserPhotoIndex(
                         (prev) => Math.min(photos.length - 1, prev + 1),
                       );
                    }
                  }
                }}
              >
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentUserPhotoIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={
                    getAssetUrl(
                      (Array.isArray(selectedUser.ProfilePhotos) &&
                      selectedUser.ProfilePhotos.length > 0
                        ? selectedUser.ProfilePhotos
                        : [selectedUser.Thumbnail])[currentUserPhotoIndex] ||
                        selectedUser.Thumbnail ||
                        "",
                    ) || USER_PLACEHOLDER
                  }
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-transparent to-transparent opacity-60 pointer-events-none" />

              {/* Progress Bar Indicators at Top */}
              {(() => {
                const photos =
                  Array.isArray(selectedUser.ProfilePhotos) &&
                  selectedUser.ProfilePhotos.length > 0
                    ? selectedUser.ProfilePhotos
                    : ([selectedUser.Thumbnail].filter(Boolean) as string[]);
                if (photos.length <= 1) return null;
                return (
                  <div className="absolute top-12 left-6 right-6 flex gap-1 z-20">
                    {photos.map((_: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          i === currentUserPhotoIndex
                            ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                            : "bg-white/20",
                        )}
                      />
                    ))}
                  </div>
                );
              })()}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUser(null);
                }}
                className="absolute top-8 left-6 w-10 h-10 z-30 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="absolute bottom-6 right-6 z-20">
                <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-xs font-bold text-amber-400 flex items-center shadow-lg border border-white/5 uppercase">
                  🛡️ {(selectedUser.TrustScore || 100).toFixed(1)} TRUST
                </div>
              </div>

              <div className="absolute bottom-6 left-8 right-8 pointer-events-none">
                <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg">
                  {selectedUser.RealName}
                </h2>
                <div className="flex gap-4">
                  {selectedUser.Gender && (
                    <p className="text-sm font-bold text-brand-accent uppercase tracking-widest drop-shadow-md">
                      {selectedUser.Gender}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 -mt-4 relative z-10 space-y-8 pb-4">
              {/* Bio */}
              <div>
                <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-2 uppercase pt-[30px] pl-0">
                  About Me
                </h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  {selectedUser.Bio || "No bio added yet."}
                </p>
              </div>

              {/* Lifestyle */}
              {(selectedUser.Gender) && (
                <section>
                  <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">
                    Lifestyle
                  </h3>
                  <div className="space-y-3">
                    {selectedUser.Gender && (
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40 mb-1">
                            Gender
                          </span>
                          <span className="text-sm text-white font-medium uppercase">
                            {selectedUser.Gender}
                          </span>
                        </div>
                        <UserIcon size={16} className="text-white/20" />
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Work & Ed */}
              {(selectedUser.JobTitle || selectedUser.School) && (
                <section>
                  <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">
                    Work & Education
                  </h3>
                  <div className="space-y-3">
                    {selectedUser.JobTitle && (
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <Briefcase
                          size={18}
                          className="text-white/20 shrink-0"
                        />
                        <span className="text-sm text-white font-medium">
                          {selectedUser.JobTitle}{" "}
                          {selectedUser.Company && `at ${selectedUser.Company}`}
                        </span>
                      </div>
                    )}
                    {selectedUser.School && (
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <GraduationCap
                          size={18}
                          className="text-white/20 shrink-0"
                        />
                        <span className="text-sm text-white font-medium">
                          {selectedUser.School}{" "}
                          {selectedUser.Degree && `- ${selectedUser.Degree}`}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Socials */}
              {(selectedUser.Instagram || selectedUser.Twitter) && (
                <section className="mb-4">
                  <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">
                    Socials
                  </h3>
                  <div className="flex gap-3">
                    {selectedUser.Instagram && (
                      <a
                        href={`https://instagram.com/${selectedUser.Instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                      >
                        <Instagram
                          size={18}
                          className="text-pink-500 shrink-0 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">
                          @{selectedUser.Instagram}
                        </span>
                      </a>
                    )}
                    {selectedUser.Twitter && (
                      <a
                        href={`https://x.com/${selectedUser.Twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                      >
                        <Twitter
                          size={18}
                          className="text-blue-400 shrink-0 group-hover:scale-110 transition-transform"
                        />
                        <span className="text-sm text-white font-medium truncate group-hover:text-brand-primary transition-colors">
                          @{selectedUser.Twitter}
                        </span>
                      </a>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="px-6 pb-28 pt-4">
              <button
                onClick={handleDM}
                className="w-full py-5 rounded-[24px] bg-white text-black text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white/90"
              >
                <Send size={16} />
                Send Message
              </button>
            </div>
           </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
