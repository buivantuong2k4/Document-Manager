import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen,
  MessageSquare,
  FileSignature,
  AlertTriangle,
  Users,
  FileText,
  PenTool, // Import thêm icon này cho đẹp
} from "lucide-react";

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  // Dữ liệu mẫu cho Dashboard (Statics) - GIỮ NGUYÊN CŨ
  const stats = [
    {
      title: "Tổng tài liệu",
      value: "1,234",
      change: "+12%",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Chat RAG",
      value: "456",
      change: "+8%",
      icon: MessageSquare,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Ký số",
      value: "89",
      change: "+23%",
      icon: FileSignature,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Cảnh báo",
      value: "3",
      change: "-5%",
      icon: AlertTriangle,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome Section - GIỮ NGUYÊN CŨ */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            Xin chào, {user?.name || user?.full_name || "User"}! 👋
          </h1>
          <p className="text-blue-100">
            {user?.role === "ADMIN"
              ? "Chào mừng quản trị viên. Hệ thống đang hoạt động ổn định."
              : "Chúc bạn một ngày làm việc hiệu quả với trợ lý AI."}
          </p>
        </div>
        {/* Background Decoration */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-12"></div>
      </div>

      {/* Stats Grid - GIỮ NGUYÊN CŨ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon
                    className={`bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}
                    size={24}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${
                    stat.change.startsWith("+")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions - PHẦN NÀY ĐÃ SỬA */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Thao tác nhanh
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* === NÚT MỚI: QUẢN LÝ KÝ SỐ (GỘP 3 MỤC) === */}
            <button
              onClick={() => navigate("/signature-manager")} // Chuyển đến trang gộp
              className="p-4 border border-blue-200 bg-blue-50 rounded-xl hover:border-blue-500 hover:bg-blue-100 transition group flex flex-col items-center justify-center text-center h-32"
            >
              <PenTool
                className="text-blue-500 group-hover:scale-110 mb-3 transition"
                size={32}
              />
              <p className="font-bold text-blue-800">Quản lý Ký số</p>
              <span className="text-xs text-blue-600 mt-1">
                Danh sách, Đã ký, Ký ảnh
              </span>
            </button>
            {/* =========================================== */}

            {/* Nút Chat (Giữ lại) */}
            <button
              onClick={() => navigate("/chat")}
              className="p-4 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition group flex flex-col items-center justify-center text-center h-32"
            >
              <MessageSquare
                className="text-gray-400 group-hover:text-purple-500 mb-3 transition"
                size={32}
              />
              <p className="font-medium text-gray-700 group-hover:text-purple-700">
                RAG Chat AI
              </p>
            </button>

            {/* Chỉ hiện cho Admin (Giữ lại) */}
            {user?.role === "ADMIN" && (
              <button
                onClick={() => navigate("/admin")}
                className="col-span-2 p-4 border border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition group flex flex-row items-center justify-center gap-3"
              >
                <Users
                  className="text-gray-400 group-hover:text-red-500"
                  size={24}
                />
                <p className="font-medium text-gray-700 group-hover:text-red-700">
                  Quản trị Người dùng & Rủi ro
                </p>
              </button>
            )}
          </div>
        </div>

        {/* System Status (Static) - GIỮ NGUYÊN CŨ */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Hoạt động gần đây
          </h2>
          <div className="space-y-4">
            {[
              {
                action: "Đã đăng nhập hệ thống",
                time: "Vừa xong",
                icon: Users,
                color: "text-green-500",
              },
              {
                action: "Hệ thống đã sẵn sàng",
                time: "1 phút trước",
                icon: AlertTriangle,
                color: "text-blue-500",
              },
            ].map((act, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition"
              >
                <act.icon size={20} className={act.color} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {act.action}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
