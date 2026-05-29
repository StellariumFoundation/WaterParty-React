import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Send,
  ChevronLeft,
  Info,
  Calendar,
  MapPin,
  Users,
  Clock,
  Trash2,
  X,
  Instagram,
  Twitter,
  ExternalLink,
  User as UserIcon,
  Briefcase,
  GraduationCap,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, compressImage } from "../lib/utils";
import { useStore } from "../lib/Store";
import { getAssetUrl, API_BASE } from "../lib/constants";

// Since we don't have a real chat message event on server yet,
// we'll mock the active chat experience but allow sending
export function ChatRoomPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { chats, user, sendSocketMessage, feed, registrations, addLocalChat } = useStore();
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportingInFlight, setReportingInFlight] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportTargetUser, setReportTargetUser] = useState<any | null>(null);

  const [localChat, setLocalChat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = chats.find((c) => c.ID === chatId);
    if (found) {
      setLocalChat(found);
      setLoading(false);
    } else if (chatId && user) {
      fetch(`${API_BASE}/api/chats?userId=${user.ID}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const foundInFetched = data.find((c: any) => c.ID === chatId);
            if (foundInFetched) {
              setLocalChat(foundInFetched);
            }
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [chats, chatId, user]);

  const chat = chats.find((c) => c.ID === chatId) || localChat;
  const associatedParty = feed.find((p) => p.ID === chat?.PartyID);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isHost = associatedParty?.HostID === user?.ID;

  useEffect(() => {
    if (chat && !chat.IsGroup && user) {
      const otherId = chat.ParticipantIDs?.find((id) => id !== user.ID);
      if (otherId) {
        fetch(`${API_BASE}/api/users/${otherId}`)
          .then((res) => res.json())
          .then((data) => setOtherUser(data))
          .catch((err) => console.error("Other user fetch failed", err));
      }
    }
  }, [chat, user]);

  useEffect(() => {
    if (isHost && showManagement && associatedParty) {
      sendSocketMessage("GET_REGISTRATIONS", { PartyID: associatedParty.ID });
    }
  }, [showManagement, isHost, associatedParty?.ID]);

  useEffect(() => {
    setShowInfo(false);
    setShowManagement(false);
    setIsConfirmingDelete(false);
    setSelectedUser(null);
    setOtherUser(null);
    setCurrentPhotoIndex(0);
    setMessage("");
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.RecentMessages]);

  if (loading && !chat) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/40 mb-4 font-bold uppercase tracking-widest animate-pulse">
          Establishing Session Code...
        </p>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-white/40 mb-4 font-bold uppercase tracking-widest text-[#FF3B5C]">
          Session Signal Lost
        </p>
        <button
          onClick={() => navigate("/messages")}
          className="px-6 py-3 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-white/10"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const handleSend = (e?: any) => {
    e?.preventDefault();
    if (!message.trim() && !selectedImage && !selectedVideo) return;

    const newMessageContent = message;
    const msgImage = selectedImage || undefined;
    const msgVideo = selectedVideo || undefined;

    // Optimistic Update
    if (chat && user) {
       addLocalChat({
          ...chat,
          RecentMessages: [
             ...(chat.RecentMessages || []),
             {
                SenderID: user.ID,
                Content: newMessageContent,
                Timestamp: new Date().toISOString(),
                ImageUrl: msgImage,
                VideoUrl: msgVideo
             }
          ]
       });
    }

    sendSocketMessage("SEND_MESSAGE", {
      ChatID: chat.ID,
      Content: message,
      ImageUrl: selectedImage || undefined,
      VideoUrl: selectedVideo || undefined,
    });
    setMessage("");
    setSelectedImage(null);
    setSelectedVideo(null);
    setUploadError(null);
  };

  const handleLocalImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE_MB = 20;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      setSelectedImage(null);
      setSelectedVideo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadError(null);
    setUploadingImage(true);

    const isVideo = file.type.startsWith("video/") || 
                    file.name.endsWith(".mp4") || 
                    file.name.endsWith(".webm") || 
                    file.name.endsWith(".mov");

    const reader = new FileReader();
    reader.onloadend = async () => {
      if (reader.result) {
        try {
          if (isVideo) {
            setSelectedVideo(reader.result as string);
            setSelectedImage(null);
          } else {
            const compressed = await compressImage(reader.result as string, 1000, 1000, 0.7);
            setSelectedImage(compressed);
            setSelectedVideo(null);
          }
        } catch (err) {
          console.error("Processing failed:", err);
          setUploadError("Could not read media file.");
        }
      }
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadMedia = async (url: string, isVideo: boolean = false) => {
    const ext = isVideo ? "mp4" : "png";
    const prefix = isVideo ? "shared-video" : "shared-image";
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${prefix}-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `${prefix}-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadImage = async (url: string) => {
    await handleDownloadMedia(url, false);
  };

  const handleReportSubmit = async () => {
    if (!user || !reportTargetUser || !reportReason) {
      setReportError("Please select a reason for reporting.");
      return;
    }

    setReportingInFlight(true);
    setReportError(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ReporterID: user.ID,
          ReportedUserID: reportTargetUser.ID,
          Reason: reportReason,
          Details: reportDetails,
        }),
      });

      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
          setReportReason("");
          setReportDetails("");
          setReportTargetUser(null);
        }, 2200);
      } else {
        const errData = await res.json();
        setReportError(errData.error || "Failed to submit report. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setReportError("Network error. Please check your connection and try again.");
    } finally {
      setReportingInFlight(false);
    }
  };

  const handleUserClick = async (userId: string) => {
    if (userId === user?.ID) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDM = async () => {
    if (!selectedUser || !user) return;

    // check if we already have a DM with this user
    const existingChat = chats.find(
      (c) =>
        !c.IsGroup &&
        c.ParticipantIDs?.includes(user.ID) &&
        c.ParticipantIDs?.includes(selectedUser.ID),
    );

    if (existingChat) {
      setSelectedUser(null);
      setCurrentPhotoIndex(0);
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
            targetUserId: selectedUser.ID,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.ChatID) {
            // Register new chat room instantly in client store
            addLocalChat({
              ID: data.ChatID,
              PartyID: "DM",
              Title: `${user.RealName} & ${selectedUser.RealName}`,
              ImageUrl: selectedUser.Thumbnail || "",
              RecentMessages: [],
              IsGroup: false,
              ParticipantIDs: [user.ID, selectedUser.ID]
            });
            sendSocketMessage("GET_CHATS", {});
            setSelectedUser(null);
            setCurrentPhotoIndex(0);
            navigate(`/chat/${data.ChatID}`);
          }
        }
      } catch (err) {
        console.error("Failed to create DM via POST:", err);
      }
    }
  };

  const handleDeleteParty = () => {
    if (!associatedParty) return;
    sendSocketMessage("DELETE_PARTY", { PartyID: associatedParty.ID });
    navigate("/messages");
  };

  const getETA = () => {
    if (!chat.IsGroup) return "DIRECT";
    if (!associatedParty?.StartTime) return "ESTABLISHING...";

    const start = new Date(associatedParty.StartTime);
    const now = new Date();
    const diff = start.getTime() - now.getTime();

    // If party is in the future
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 24) return `IN ${Math.floor(hours / 24)}D ${hours % 24}H`;
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `IN ${hours}H ${mins}M`;
    }

    // If party is currently happening (assuming 6h duration max)
    const end = new Date(
      start.getTime() + (associatedParty.DurationHours || 6) * 3600 * 1000,
    );
    if (now < end) {
      const remainingDiff = end.getTime() - now.getTime();
      const remHours = Math.floor(remainingDiff / (1000 * 60 * 60));
      const remMins = Math.floor(
        (remainingDiff % (1000 * 60 * 60)) / (1000 * 60),
      );
      return `${remHours}H ${remMins}M LEFT`;
    }

    // If party ended, show how long ago it was
    const agoDiff = now.getTime() - end.getTime();
    const agoHours = Math.floor(agoDiff / (1000 * 60 * 60));
    if (agoHours > 24) return `${Math.floor(agoHours / 24)}D AGO`;
    return `${agoHours}H AGO`;
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0B14] shadow-2xl">
      {/* Header - Clickable for full info */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-white/5 bg-[#11131F] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/messages")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/50 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={
                !chat.IsGroup && otherUser
                  ? getAssetUrl(
                      otherUser.Thumbnail || otherUser.ProfilePhotos?.[0] || "",
                    )
                  : chat.ImageUrl
                    ? getAssetUrl(chat.ImageUrl)
                    : "https://images.unsplash.com/photo-1542382103-6fdb3a652d8e?q=80&w=800&auto=format&fit=crop"
              }
              className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-brand-accent transition-colors"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate max-w-[150px] group-hover:text-brand-accent transition-colors">
                {!chat.IsGroup && otherUser ? otherUser.RealName : chat.Title}
              </h3>
              <p className="text-[9px] font-black text-brand-accent uppercase tracking-widest">
                {getETA()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isHost && (
            <button
              onClick={() => setShowManagement(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-brand-accent hover:bg-white/10 active:scale-95 transition-all"
            >
              <Users size={20} />
            </button>
          )}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
              showInfo
                ? "bg-brand-accent text-[#0A0B14]"
                : "bg-white/5 text-white/50",
            )}
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Chat Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-hide pb-10"
        >
          <div className="py-4" />

          {chat.RecentMessages?.map((msg: any, idx: number) => {
            const isMe = msg.SenderID === user?.ID;
            return (
              <div
                key={idx}
                className={cn(
                  "flex gap-3 mb-6",
                  isMe ? "flex-row-reverse" : "flex-row",
                )}
              >
                {!isMe && (
                  <img
                    src={
                      !chat.IsGroup &&
                      otherUser &&
                      msg.SenderID === otherUser.ID
                        ? getAssetUrl(
                            otherUser.Thumbnail ||
                              otherUser.ProfilePhotos?.[0] ||
                              "",
                          )
                        : chat.ImageUrl
                          ? getAssetUrl(chat.ImageUrl)
                          : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100"
                    }
                    className="w-10 h-10 rounded-2xl object-cover border border-white/5 bg-white/5 shrink-0 cursor-pointer hover:border-brand-accent transition-all active:scale-95"
                    onClick={() => handleUserClick(msg.SenderID)}
                  />
                )}
                <div
                  className={cn(
                    "flex flex-col max-w-[75%]",
                    isMe ? "items-end" : "items-start",
                  )}
                >
                  <div
                    onClick={() => !isMe && handleUserClick(msg.SenderID)}
                    className={cn(
                      "px-5 py-3.5 rounded-[28px] shadow-2xl relative overflow-hidden",
                      isMe
                        ? "bg-gradient-to-br from-[#FF3B5C] to-[#7042F8] text-white rounded-tr-none"
                        : "bg-[#1A1A24] text-white/90 rounded-tl-none border border-white/5 cursor-pointer hover:bg-[#252533] transition-colors",
                      (msg.ImageUrl || msg.VideoUrl) && "p-1.5 max-w-[280px]"
                    )}
                  >
                    {msg.ImageUrl && (
                      <div className="relative rounded-[20px] overflow-hidden bg-black/40">
                        <img
                          src={getAssetUrl(msg.ImageUrl)}
                          alt="Attached media"
                          className="w-full max-h-72 object-cover rounded-[20px] cursor-zoom-in hover:scale-[1.02] active:scale-95 transition-all duration-200"
                          referrerPolicy="no-referrer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(getAssetUrl(msg.ImageUrl));
                          }}
                        />
                      </div>
                    )}
                    {msg.VideoUrl && (
                      <div className="relative rounded-[20px] overflow-hidden bg-black/40 group cursor-pointer">
                        <video
                          src={getAssetUrl(msg.VideoUrl)}
                          className="w-full max-h-72 object-cover rounded-[20px] cursor-zoom-in hover:scale-[1.02] active:scale-95 transition-all duration-200"
                          playsInline
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxVideo(getAssetUrl(msg.VideoUrl));
                          }}
                        />
                        {/* Interactive Play icon overlay */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxVideo(getAssetUrl(msg.VideoUrl));
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-all duration-200 cursor-zoom-in"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shrink-0 shadow-lg hover:scale-110 active:scale-90 transition-transform">
                            <svg className="w-5 h-5 fill-current translate-x-0.5 text-white" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.Content && (
                      <p className={cn(
                        "text-[14px] font-medium leading-relaxed tracking-tight",
                        (msg.ImageUrl || msg.VideoUrl) ? "px-3.5 py-2.5 mt-1" : ""
                      )}>
                        {msg.Content}
                      </p>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-[8px] mt-2 font-black uppercase tracking-widest text-white/20 px-1",
                    )}
                  >
                    {new Date(msg.Timestamp || Date.now()).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </p>
                </div>
              </div>
            );
          })}

          {chat.RecentMessages?.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <p className="text-xs font-black text-white/10 uppercase tracking-[0.4em]">
                Establishing Signal...
              </p>
            </div>
          )}
        </div>

        {/* Info Sidebar Overlay - Now showing ALL Party Info */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="absolute inset-0 bg-[#0A0B14] z-20 border-l border-white/5 flex flex-col overflow-y-auto scrollbar-hide"
            >
              {chat.IsGroup ? (
                <>
                  {associatedParty?.PartyPhotos &&
                    associatedParty.PartyPhotos.length > 0 && (
                      <div
                        className="relative h-[75dvh] w-full overflow-hidden shrink-0 cursor-pointer"
                        onClick={() => {
                          if (associatedParty.PartyPhotos.length > 1) {
                            setCurrentPhotoIndex(
                              (prev) =>
                                (prev + 1) %
                                associatedParty.PartyPhotos.length,
                            );
                          }
                        }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.img
                            key={currentPhotoIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            src={getAssetUrl(
                              associatedParty.PartyPhotos[currentPhotoIndex] ||
                                "",
                            )}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </AnimatePresence>

                        {/* Progress Bar Indicators at Top */}
                        {associatedParty.PartyPhotos.length > 1 && (
                          <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-20">
                            {associatedParty.PartyPhotos.map(
                              (_: any, i: number) => (
                                <div
                                  key={i}
                                  className={cn(
                                    "h-1 flex-1 rounded-full transition-all duration-300",
                                    i === currentPhotoIndex
                                      ? "bg-brand-accent shadow-[0_0_8px_rgba(0,210,255,0.6)]"
                                      : "bg-white/20",
                                  )}
                                />
                              ),
                            )}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-[#0A0B14]/40 to-transparent pointer-events-none" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowInfo(false);
                            setCurrentPhotoIndex(0);
                          }}
                          className="absolute top-8 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}

                  <div className="p-5 space-y-4">
                    <div>
                      <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-1">
                        {associatedParty?.Title || chat.Title}
                      </h2>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                        <p className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em]">
                          {associatedParty?.PartyType || "SESSION"}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-white/50 leading-relaxed uppercase tracking-tight">
                        {associatedParty?.Description || "NO DATA RECEIVED"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                        <Calendar
                          className="text-brand-accent mb-1.5"
                          size={16}
                        />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                          Timeline
                        </p>
                        <p className="text-xs font-bold text-white uppercase">
                          {associatedParty?.StartTime
                            ? new Date(
                                associatedParty.StartTime,
                              ).toLocaleDateString([], {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })
                            : "TBD"}
                        </p>
                      </div>
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                        <MapPin className="text-brand-accent mb-1.5" size={16} />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                          Vibe City
                        </p>
                        <p className="text-xs font-bold text-white uppercase">
                          {associatedParty?.City || "LOCATION TBD"}
                        </p>
                      </div>
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                        <Users className="text-brand-accent mb-1.5" size={16} />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                          Sync count
                        </p>
                        <p className="text-xs font-bold text-white uppercase tracking-tight">
                          {associatedParty?.CurrentGuestCount || 0} /{" "}
                          {associatedParty?.MaxCapacity || 300} GUESTS
                        </p>
                      </div>
                      <div className="bg-[#11131F] border border-white/5 rounded-2xl p-3.5">
                        <Clock className="text-brand-accent mb-1.5" size={16} />
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-0.5">
                          Status
                        </p>
                        <p className="text-xs font-bold text-white uppercase">
                          {getETA()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4">
                      <h4 className="text-[10px] font-black text-white tracking-[0.2em] uppercase mb-1.5 flex items-center gap-2">
                        <MapPin size={12} className="text-brand-accent" /> EXACT
                        COORDINATES
                      </h4>
                      <p className="text-[11px] font-bold text-white/40 leading-relaxed">
                        {associatedParty?.Address ||
                          "Visible only to confirmed attendees"}
                      </p>
                    </div>

                    {associatedParty && (
                      <div
                        onClick={() => handleUserClick(associatedParty.HostID)}
                        className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors active:scale-95"
                      >
                        <img
                          src={
                            associatedParty.HostThumbnail
                              ? getAssetUrl(associatedParty.HostThumbnail)
                              : "https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=400"
                          }
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#00FFA3]"
                        />
                        <div>
                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-0.5">
                            Hosted By
                          </p>
                          <p className="text-sm font-bold text-white tracking-tight">
                            {associatedParty.HostName || "Unknown"}
                          </p>
                        </div>
                        <ChevronLeft
                          size={16}
                          className="text-white/20 ml-auto rotate-180"
                        />
                      </div>
                    )}

                    {user && associatedParty && associatedParty.HostID !== user.ID && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user || !associatedParty.HostID) return;
                          
                          const targetUserId = associatedParty.HostID;
                          const targetName = associatedParty.HostName || "Host";
                          const targetThumbnail = associatedParty.HostThumbnail;

                          const existingChat = chats.find(
                            (c) =>
                              !c.IsGroup &&
                              c.ParticipantIDs?.includes(user.ID) &&
                              c.ParticipantIDs?.includes(targetUserId),
                          );

                          if (existingChat) {
                            setShowInfo(false);
                            setSelectedUser(null);
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
                                                      setShowInfo(false);
                                                      setSelectedUser(null);
                                                      navigate(`/chat/${data.ChatID}`);
                                                    }
                                                  }
                                                } catch (err) {
                                                  console.error("Failed to create DM with host:", err);
                                                }
                                              }
                                            }}
                                            className="w-full mt-4 py-4 rounded-[24px] bg-white text-black text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white/90"
                                          >
                                            <Send size={16} />
                                            Send Message to Host
                                          </button>
                                        )}

                    {isHost && associatedParty && (
                      <div className="pt-8 border-t border-white/5 mt-6">
                        {!isConfirmingDelete ? (
                          <button
                            onClick={() => setIsConfirmingDelete(true)}
                            className="w-full py-5 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-red-500/20"
                          >
                            <Trash2 size={16} />
                            Dissolve Party Hub
                          </button>
                        ) : (
                          <div className="flex flex-col gap-4">
                            <p className="text-red-500 text-[10px] text-center font-bold tracking-widest uppercase">
                              Are you absolutely sure? This cannot be undone.
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={handleDeleteParty}
                                className="flex-1 py-4 rounded-[20px] bg-red-500 border border-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center active:scale-95 transition-all outline-none"
                              >
                                YES, DISSOLVE
                              </button>
                              <button
                                onClick={() => setIsConfirmingDelete(false)}
                                className="className-1 py-4 rounded-[20px] bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center active:scale-95 transition-all hover:bg-white/10 outline-none"
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col flex-1">
                  {otherUser ? (
                    <>
                      <div className="relative h-96 w-full shrink-0 group">
                        <div
                          className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                          onScroll={(e) => {
                            const idx = Math.round(
                              e.currentTarget.scrollLeft /
                                e.currentTarget.offsetWidth,
                            );
                            setCurrentPhotoIndex(idx);
                          }}
                        >
                          {(otherUser.ProfilePhotos?.length > 0
                            ? otherUser.ProfilePhotos
                            : [otherUser.Thumbnail || ""]
                          )
                            .filter(Boolean)
                            .map((photo: string, idx: number) => (
                              <div
                                key={idx}
                                className="w-full h-full flex-none snap-center relative"
                              >
                                <img
                                  src={
                                    getAssetUrl(photo) ||
                                    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800"
                                  }
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-[#0A0B14]/40 to-transparent pointer-events-none" />
                              </div>
                            ))}
                        </div>

                        <button
                          onClick={() => {
                            setShowInfo(false);
                            setCurrentPhotoIndex(0);
                          }}
                          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                        >
                          <X size={20} />
                        </button>

                        <div className="absolute bottom-6 right-6 z-20">
                          <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-xs font-bold text-amber-400 flex items-center shadow-lg border border-white/5 uppercase">
                            🛡️ {(otherUser.TrustScore || 100).toFixed(1)} TRUST
                          </div>
                        </div>

                        <div className="absolute bottom-6 left-8 right-8 pointer-events-none z-10">
                          <h2 className="text-4xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg">
                            {otherUser.RealName}
                          </h2>
                          <div className="flex gap-4">
                            {otherUser.Gender && (
                              <p className="text-sm font-bold text-brand-accent uppercase tracking-widest drop-shadow-md">
                                {otherUser.Gender}
                              </p>
                            )}
                          </div>
                        </div>

                        {otherUser.ProfilePhotos?.length > 1 && (
                          <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                            {otherUser.ProfilePhotos.map(
                              (_: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    currentPhotoIndex === idx
                                      ? "w-4 bg-brand-accent shadow-[0_0_8px_rgba(33,212,253,0.5)]"
                                      : "w-1.5 bg-white/30",
                                  )}
                                />
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <div className="px-6 -mt-[13px] relative z-10 space-y-8 pb-32 pt-[16px]">
                        {/* Name & Bio */}
                        <div>
                          <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-0 uppercase pt-0 pl-0">
                            About Me
                          </h3>
                          <p className="text-sm text-white/80 leading-relaxed">
                            {otherUser.Bio || "No bio added yet."}
                          </p>
                        </div>

                        {/* Lifestyle */}
                        {(otherUser.Gender) && (
                          <section>
                            <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">
                              Lifestyle
                            </h3>
                            <div className="space-y-3">
                              {otherUser.Gender && (
                                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] text-white/40 mb-1">
                                      Gender
                                    </span>
                                    <span className="text-sm text-white font-medium uppercase">
                                      {otherUser.Gender}
                                    </span>
                                  </div>
                                  <UserIcon
                                    size={16}
                                    className="text-white/20"
                                  />
                                </div>
                              )}
                            </div>
                          </section>
                        )}

                        {/* Work & Ed */}
                        {(otherUser.JobTitle || otherUser.School) && (
                          <section>
                            <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">
                              Work & Education
                            </h3>
                            <div className="space-y-3">
                              {otherUser.JobTitle && (
                                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                  <Briefcase
                                    size={18}
                                    className="text-white/20 shrink-0"
                                  />
                                  <span className="text-sm text-white font-medium">
                                    {otherUser.JobTitle}{" "}
                                    {otherUser.Company &&
                                      `at ${otherUser.Company}`}
                                  </span>
                                </div>
                              )}
                              {otherUser.School && (
                                <div className="bg-[#11131F] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                                  <GraduationCap
                                    size={18}
                                    className="text-white/20 shrink-0"
                                  />
                                  <span className="text-sm text-white font-medium">
                                    {otherUser.School}{" "}
                                    {otherUser.Degree &&
                                      `- ${otherUser.Degree}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </section>
                        )}

                        {/* Socials */}
                        {(otherUser.Instagram || otherUser.Twitter) && (
                          <section className="mb-4">
                            <h3 className="text-[10px] font-bold text-white/40 tracking-wider mb-3 uppercase">
                              Socials
                            </h3>
                            <div className="flex gap-3">
                              {otherUser.Instagram && (
                                <a
                                  href={`https://instagram.com/${otherUser.Instagram}`}
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
                                    @{otherUser.Instagram}
                                  </span>
                                </a>
                              )}
                              {otherUser.Twitter && (
                                <a
                                  href={`https://x.com/${otherUser.Twitter}`}
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
                                    @{otherUser.Twitter}
                                  </span>
                                </a>
                              )}
                            </div>
                          </section>
                        )}

                        <div className="pt-6 border-t border-white/10 uppercase">
                          <button
                            onClick={() => {
                              setReportReason("");
                              setReportDetails("");
                              setReportError(null);
                              setReportSuccess(false);
                              setReportTargetUser(otherUser);
                              setShowReportModal(true);
                            }}
                            className="w-full py-4 text-xs font-black text-red-500 hover:text-red-400 transition-colors tracking-widest text-center cursor-pointer"
                          >
                            REPORT PROFILE
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 opacity-20">
                      <p className="text-xs font-black uppercase tracking-[0.3em]">
                        Syncing Profile...
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Management Overlay */}
        <AnimatePresence>
          {showManagement && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 top-0 bg-[#0A0B14] z-30 flex flex-col"
            >
              <header className="px-6 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    Guest Control
                  </h3>
                  <p className="text-[9px] font-bold text-white/30 uppercase mt-1">
                    Manage Signal Requests
                  </p>
                </div>
                <button
                  onClick={() => setShowManagement(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {registrations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                    <Users size={48} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">
                      No Pending Signals
                    </p>
                  </div>
                ) : (
                  registrations.map((reg: any) => (
                    <div
                      key={reg.ID}
                      className="bg-[#11131F] border border-white/5 rounded-[24px] p-4 flex items-center gap-4"
                    >
                      <img
                        onClick={() => handleUserClick(reg.UserID)}
                        src={
                          getAssetUrl(
                            reg.UserThumbnail ||
                              reg.UserProfilePhotos?.[0] ||
                              "",
                          ) ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200"
                        }
                        className="w-12 h-12 rounded-full object-cover border border-white/10 cursor-pointer hover:border-brand-accent transition-colors"
                      />
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => handleUserClick(reg.UserID)}
                      >
                        <p className="text-sm font-bold text-white truncate cursor-pointer hover:text-brand-accent transition-colors">
                          {reg.RealName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                              reg.Status === "PENDING"
                                ? "text-yellow-500 border-yellow-500/20 bg-yellow-500/5"
                                : "text-brand-accent border-brand-accent/20 bg-brand-accent/5",
                            )}
                          >
                            {reg.Status}
                          </span>
                          <span className="text-[8px] font-bold text-white/20 uppercase">
                            {new Date(reg.Timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {reg.Status === "PENDING" && (
                        <button
                          onClick={() =>
                            sendSocketMessage("APPROVE_JOIN_REQUEST", {
                              RegistrationID: reg.ID,
                            })
                          }
                          className="px-4 py-2 bg-brand-accent text-[#0A0B14] text-[10px] font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-brand-accent/20"
                        >
                          APPROVE
                        </button>
                      )}
                    </div>
                  ))
                )}
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
              className="absolute inset-0 bg-[#0A0B14] z-[60] flex flex-col overflow-y-auto scrollbar-hide"
            >
              <div className="relative h-96 w-full shrink-0 group">
                <div
                  className="w-full h-full flex overflow-x-auto snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  onScroll={(e) => {
                    const idx = Math.round(
                      e.currentTarget.scrollLeft / e.currentTarget.offsetWidth,
                    );
                    setCurrentPhotoIndex(idx);
                  }}
                >
                  {(selectedUser.ProfilePhotos?.length > 0
                    ? selectedUser.ProfilePhotos
                    : [selectedUser.Thumbnail || ""]
                  )
                    .filter(Boolean)
                    .map((photo: string, idx: number) => (
                      <div
                        key={idx}
                        className="w-full h-full flex-none snap-center relative"
                      >
                        <img
                          src={
                            getAssetUrl(photo) ||
                            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800"
                          }
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14] via-[#0A0B14]/40 to-transparent pointer-events-none" />
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setCurrentPhotoIndex(0);
                  }}
                  className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="absolute bottom-6 right-6 z-20">
                  <div className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-xs font-bold text-amber-400 flex items-center shadow-lg border border-white/5 uppercase">
                    🛡️ {(selectedUser.TrustScore || 100).toFixed(1)} TRUST
                  </div>
                </div>

                <div className="absolute bottom-6 left-8 right-8 pointer-events-none z-10">
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

                {selectedUser.ProfilePhotos?.length > 1 && (
                  <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                    {selectedUser.ProfilePhotos.map((_: any, idx: number) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          currentPhotoIndex === idx
                            ? "w-4 bg-brand-accent shadow-[0_0_8px_rgba(33,212,253,0.5)]"
                            : "w-1.5 bg-white/30",
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="px-6 -mt-4 relative z-10 space-y-8 pb-32 pt-10">
                {/* Name & Bio */}
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
                            {selectedUser.Company &&
                              `at ${selectedUser.Company}`}
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

                <div className="pt-6 border-t border-white/10 uppercase">
                  <button
                    onClick={() => {
                      setReportReason("");
                      setReportDetails("");
                      setReportError(null);
                      setReportSuccess(false);
                      setReportTargetUser(selectedUser);
                      setShowReportModal(true);
                    }}
                    className="w-full py-4 text-xs font-black text-red-500 hover:text-red-400 transition-colors tracking-widest text-center cursor-pointer"
                  >
                    REPORT PROFILE
                  </button>
                </div>

                {chat.IsGroup && (
                  <div className="pt-4">
                    <button
                      onClick={handleDM}
                      className="w-full py-5 rounded-[24px] bg-white text-black text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-white/90"
                    >
                      <Send size={16} />
                      Send Message
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Image Lightbox with Save & Download action */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setLightboxImage(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
            >
              {/* Top controls header */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-6 pointer-events-auto"
              >
                <button
                  onClick={() => setLightboxImage(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all cursor-pointer border border-white/5 active:scale-95"
                >
                  <X size={18} />
                </button>
                
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
                  IMAGE VIEWER
                </span>

                <button
                  onClick={() => handleDownloadImage(lightboxImage)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-accent/20 text-brand-accent hover:text-white hover:bg-brand-accent transition-all cursor-pointer border border-brand-accent/25 active:scale-95"
                  title="Save Shared Image"
                >
                  <Download size={18} />
                </button>
              </motion.div>

              {/* Main Image content */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-full max-h-[85vh] flex items-center justify-center"
              >
                <img
                  src={lightboxImage}
                  alt="Shared media detail"
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/10 select-all"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              {/* Action hints */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 15, opacity: 0 }}
                className="absolute bottom-6 text-[10px] font-black uppercase tracking-[0.25em] text-white/40"
              >
                Click backdrop to return
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Video Lightbox with Save & Download action */}
        <AnimatePresence>
          {lightboxVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setLightboxVideo(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
            >
              {/* Top controls header */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-6 pointer-events-auto"
              >
                <button
                  onClick={() => setLightboxVideo(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all cursor-pointer border border-white/5 active:scale-95"
                >
                  <X size={18} />
                </button>
                
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
                  VIDEO PLAYER
                </span>

                <button
                  onClick={() => handleDownloadMedia(lightboxVideo, true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-brand-accent/20 text-brand-accent hover:text-white hover:bg-brand-accent transition-all cursor-pointer border border-brand-accent/25 active:scale-95"
                  title="Save Shared Video"
                >
                  <Download size={18} />
                </button>
              </motion.div>

              {/* Main Video content */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-full max-h-[85vh] flex items-center justify-center"
              >
                <video
                  src={lightboxVideo}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/10"
                />
              </motion.div>

              {/* Action hints */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 15, opacity: 0 }}
                className="absolute bottom-6 text-[10px] font-black uppercase tracking-[0.25em] text-white/40"
              >
                Click backdrop to return
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Reporting modal */}
        <AnimatePresence>
          {showReportModal && reportTargetUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-default"
              onClick={() => {
                if (!reportingInFlight && !reportSuccess) {
                  setShowReportModal(false);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="w-full max-w-md bg-[#0F101A] border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
                onClick={(e) => e.stopPropagation()}
              >
                {reportSuccess ? (
                  <div className="flex flex-col items-center text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 scale-110 mb-2">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.25em] text-brand-accent">
                      REPORT TRANSMITTED
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-wide uppercase">
                      Safety Priority Queued
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed max-w-[280px]">
                      Your report regarding <strong>{reportTargetUser.RealName}</strong> has been secured and sent to the moderation team.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-red-500">
                        REPORT A USER
                      </span>
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="text-white/40 hover:text-white transition-colors"
                        disabled={reportingInFlight}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide uppercase mb-1">
                        Report {reportTargetUser.RealName}
                      </h3>
                      <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">
                        Confidential reporting secures safety. Please select a reason below.
                      </p>
                    </div>

                    {reportError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                        {reportError}
                      </div>
                    )}

                    {/* Common reasons list */}
                    <div className="space-y-2">
                      {[
                        "Harassment or bullying",
                        "Inappropriate profile photo or bio",
                        "Spam, scam, or fake profile",
                        "Hate speech or offensive conduct",
                        "Other issues"
                      ].map((reasonItem) => {
                        const isSelected = reportReason === reasonItem;
                        return (
                          <button
                            key={reasonItem}
                            type="button"
                            onClick={() => {
                              setReportReason(reasonItem);
                              setReportError(null);
                            }}
                            className={cn(
                              "w-full px-4 py-3 rounded-2xl text-left text-xs font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer",
                              isSelected
                                ? "bg-red-500/25 border-red-500 text-white shadow-lg shadow-red-500/10"
                                : "bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{reasonItem}</span>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Details input */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        Details (Optional)
                      </label>
                      <textarea
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        placeholder="PROVIDE ADDITIONAL REASONS OR CONTEXT REGARDING YOUR COMPLAINT..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-red-500/50 transition-colors uppercase font-bold tracking-tight"
                      />
                    </div>

                    {/* Action button triggers */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowReportModal(false)}
                        className="flex-1 py-3.5 rounded-2xl border border-white/10 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all text-center cursor-pointer"
                        disabled={reportingInFlight}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReportSubmit}
                        disabled={reportingInFlight || !reportReason}
                        className={cn(
                          "flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all text-center cursor-pointer",
                          reportingInFlight || !reportReason
                            ? "bg-white/5 text-white/20 cursor-not-allowed"
                            : "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/20 hover:from-red-500 hover:to-amber-500"
                        )}
                      >
                        {reportingInFlight ? "Transmitting..." : "Submit Report"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 pt-2 shrink-0 bg-[#11131F] border-t border-white/5 flex flex-col gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,video/mp4,video/webm,video/quicktime,video/mov"
          className="hidden"
          onChange={handleLocalImageUpload}
        />

        {/* Upload Error feedback banner */}
        {uploadError && (
          <div className="relative self-start ml-2 mb-1 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-red-400 hover:text-white transition-colors ml-2"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="relative self-start ml-2 mb-1 p-1 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 max-w-full">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
              <img
                src={selectedImage}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                  Sync...
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 pr-6">
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest leading-none">
                ATTACHED
              </span>
              <span className="text-[9px] text-white/40 truncate max-w-[120px] mt-1">
                Image ready to transmit
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center border border-black/50 hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Selected Video Preview */}
        {selectedVideo && (
          <div className="relative self-start ml-2 mb-1 p-1 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 max-w-full">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
              <video
                src={selectedVideo}
                className="w-full h-full object-cover"
              />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                  Sync...
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 pr-6">
              <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest leading-none">
                ATTACHED VIDEO
              </span>
              <span className="text-[9px] text-white/40 truncate max-w-[120px] mt-1">
                Video ready to transmit (Max 20MB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedVideo(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center border border-black/50 hover:bg-red-600 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="flex gap-2 bg-white/5 rounded-full p-1 border border-white/5 items-center overflow-hidden"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer",
              (selectedImage || selectedVideo)
                ? "bg-brand-accent/25 text-brand-accent"
                : "bg-white/5 text-white/50 hover:text-white"
            )}
          >
            <ImageIcon size={18} />
          </button>
          <input
            type="text"
            placeholder={
              selectedImage 
                ? "ADD CAPTION (OPTIONAL)..." 
                : selectedVideo 
                  ? "ADD VIDEO CAPTION (OPTIONAL)..." 
                  : "SEND MESSAGE..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-transparent px-2 py-3 outline-none text-sm text-white placeholder:text-white/20 font-bold uppercase tracking-tight"
          />
          <button
            type="submit"
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0",
              message.trim() || selectedImage || selectedVideo
                ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20"
                : "bg-white/5 text-white/20",
            )}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
