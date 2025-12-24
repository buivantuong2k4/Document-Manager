import React, { useState } from "react";
import { FolderOpen, FileSignature, Image } from "lucide-react";

// Import 3 component cũ của bạn
import FileGrid from "./FileGrid";
import SignedFilesUI from "./SignedFiles";
import ImageSign from "./ImageSign";

export default function SignatureManager() {
  const [activeTab, setActiveTab] = useState("files");

  // Cấu hình danh sách các tabs
  const tabs = [
    {
      id: "files",
      label: "Danh sách File",
      icon: FolderOpen,
      component: <FileGrid />,
    },
    {
      id: "signed",
      label: "File đã ký",
      icon: FileSignature,
      component: <SignedFilesUI />,
    },
    {
      id: "image",
      label: "Ký ảnh",
      icon: Image,
      component: <ImageSign />,
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header của trang quản lý ký */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Ký số</h1>
            <p className="text-gray-500">
              Quản lý tài liệu, file đã ký và ký ảnh tập trung.
            </p>
          </div>
        </div>

        {/* Thanh Tab chuyển đổi */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Nội dung chính (Hiển thị component tương ứng) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
          {tabs.find((t) => t.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );
}
