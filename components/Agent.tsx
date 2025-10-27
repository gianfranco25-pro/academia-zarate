"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  profileImage,
}: AgentProps & { profileImage?: string }) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      console.log("speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.log("Error:", error);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
        variableValues: {
          username: userName,
          userid: userId,
        },
      });
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <div className="flex flex-row w-full gap-8">
      {/* Historial de mensajes (transcripción) a la izquierda */}
      <div className="w-1/3 min-h-[400px] max-h-[600px] overflow-y-auto bg-dark-300 rounded-lg p-4 shadow-lg">
        <h4 className="text-lg font-semibold mb-4 text-primary-100">Historial</h4>
        {messages.length === 0 ? (
          <p className="text-gray-400">Aún no hay mensajes.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, idx) => (
              <li key={idx} className={cn(
                "rounded px-3 py-2",
                msg.role === "user" ? "bg-primary-100 text-white self-end ml-auto w-fit" :
                msg.role === "assistant" ? "bg-light-400 text-dark-100 self-start mr-auto w-fit" :
                "bg-gray-700 text-white"
              )}>
                <span className="block text-xs opacity-70 mb-1">
                  {msg.role === "user" ? "Tú" : msg.role === "assistant" ? "IA" : "Sistema"}
                </span>
                <span>{msg.content}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sección de llamada (centro/derecha) */}
      <div className="flex-1 flex flex-col items-center">
        <div className="call-view">
          {/* AI Interviewer Card */}
          <div className="card-interviewer">
            <div className="avatar">
              <Image
                src="/ai-avatar.png"
                alt="profile-image"
                width={65}
                height={54}
                className="object-cover"
              />
              {isSpeaking && <span className="animate-speak" />}
            </div>
            <h3>AI Interviewer</h3>
          </div>

          {/* User Profile Card */}
          <div className="card-border">
            <div className="card-content">
              <Image
                src={profileImage || "/user-avatar.png"}
                alt="profile-image"
                width={120}
                height={120}
                className="rounded-full object-cover size-[120px]"
              />
              <h3>{userName}</h3>
            </div>
          </div>
        </div>
        <div className="w-full flex justify-center mt-6">
          {callStatus !== "ACTIVE" ? (
            <button className="relative btn-call" onClick={() => handleCall()}>
              <span
                className={cn(
                  "absolute animate-ping rounded-full opacity-75",
                  callStatus !== "CONNECTING" && "hidden"
                )}
              />
              <span className="relative">
                {callStatus === "INACTIVE" || callStatus === "FINISHED"
                  ? "Llamar"
                  : ". . ."}
              </span>
            </button>
          ) : (
            <button className="btn-disconnect" onClick={() => handleDisconnect()}>
              Terminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Agent;