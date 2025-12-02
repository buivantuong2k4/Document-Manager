import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Upload,
  Menu,
  X,
  ChevronRight, // Thêm icon này nếu muốn làm đẹp tooltip (tuỳ chọn)
} from "lucide-react";

const MainLayout = ({ user, onLogout, onUploadClick, serverStatus }) => {
  const navigate = useNavigate();

  // State 1: Mobile Menu (Overlay)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // State 2: Desktop Menu (Collapsed/Expanded)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { path: "/", label: "Tổng quan", icon: LayoutDashboard },
    { path: "/documents", label: "Tài liệu", icon: FolderOpen },
    { path: "/chat", label: "Trợ lý AI", icon: MessageSquare },
  ];

  if (user?.role === "ADMIN") {
    navItems.push({ path: "/admin", label: "Quản trị", icon: ShieldAlert });
  }

  // Xử lý khi bấm nút Menu (3 gạch)
  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      // Nếu là mobile: Mở/Đóng overlay
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      // Nếu là desktop: Thu gọn/Mở rộng sidebar
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* --- MOBILE OVERLAY --- */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 transition-opacity md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
          ${/* Logic Mobile: Trượt ra vào */ ""}
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} 
          
          ${/* Logic Desktop: Đặt lại vị trí static và chỉnh độ rộng */ ""}
          md:translate-x-0 md:static md:inset-auto
          ${isSidebarCollapsed ? "md:w-20" : "md:w-64"}
        `}
      >
        {/* Sidebar Header */}
        <div
          className={`p-4 border-b border-gray-100 flex items-center h-16 ${
            isSidebarCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isSidebarCollapsed && (
            <div>
              <h1
                className="text-xl font-bold text-blue-600 cursor-pointer truncate"
                onClick={() => navigate("/")}
              >
                DocManager
              </h1>
              <p className="text-[10px] text-gray-500 mt-1 truncate max-w-[150px]">
                Server: {serverStatus}
              </p>
            </div>
          )}

          {/* Nút đóng chỉ hiện trên Mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-500"
          >
            <X size={24} />
          </button>

          {/* Logo thu gọn cho Desktop */}
          {isSidebarCollapsed && (
            <span className="font-bold text-blue-600 text-xl">DM</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? item.label : ""} // Tooltip khi thu gọn
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-lg transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100"
                  }
                  ${isSidebarCollapsed ? "justify-center" : ""}
                  `
                }
              >
                <Icon size={20} className="min-w-[20px]" />
                {/* Ẩn chữ nếu đang thu gọn */}
                <span
                  className={`transition-opacity duration-200 ${
                    isSidebarCollapsed
                      ? "hidden opacity-0"
                      : "block opacity-100"
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div
            className={`flex items-center gap-3 mb-4 ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
          >
            <img
              src={
                user.picture ||
                user.avatar ||
                "https://ui-avatars.com/api/?name=" + (user.name || "User")
              }
              alt="User"
              className="w-8 h-8 rounded-full border border-white shadow-sm flex-shrink-0"
            />
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {user.name || user.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {user.role?.toLowerCase()}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onLogout}
            title="Đăng xuất"
            className={`flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition ${
              isSidebarCollapsed ? "px-0" : ""
            }`}
          >
            <LogOut size={16} />
            {!isSidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm z-10 sticky top-0 h-16">
          <div className="flex items-center gap-3">
            {/* Nút 3 gạch: Luôn hiện (đã bỏ md:hidden) */}
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu size={24} />
            </button>

            <h2 className="text-lg font-medium text-gray-800 hidden sm:block">
              {/* Breadcrumb */}
            </h2>
          </div>

          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-blue-700 shadow-md transition ml-auto text-sm md:text-base whitespace-nowrap"
          >
            <Upload size={18} />
            <span className="hidden sm:inline">Upload Tài liệu</span>
            <span className="sm:hidden">Upload</span>
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
