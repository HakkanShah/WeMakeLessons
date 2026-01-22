"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    doc,
    updateDoc,
    deleteDoc,
} from "firebase/firestore";
import Link from "next/link";
import {
    Users,
    BookOpen,
    Activity,
    Search,
    Trash2,
    Ban,
    Check,
} from "lucide-react";

interface User {
    id: string;
    email: string;
    displayName: string;
    role: string;
    stats: { xp: number; level: number };
    createdAt: any;
}

interface Course {
    id: string;
    title: string;
    creatorId: string;
    isApproved: boolean;
    createdAt: any;
}

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [userRole, setUserRole] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"users" | "courses">("users");
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        async function checkAdminAndFetchData() {
            if (!user) return;

            // Check if user is admin
            const userDoc = await getDocs(
                query(collection(db, "users"), limit(100))
            );
            const currentUser = userDoc.docs.find((d) => d.id === user.uid);
            if (!currentUser || currentUser.data().role !== "admin") {
                router.push("/dashboard");
                return;
            }
            setUserRole("admin");

            // Fetch all users
            const usersData = userDoc.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as User[];
            setUsers(usersData);

            // Fetch all courses
            const coursesSnapshot = await getDocs(
                query(collection(db, "courses"), orderBy("createdAt", "desc"), limit(100))
            );
            const coursesData = coursesSnapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Course[];
            setCourses(coursesData);

            setLoadingData(false);
        }

        if (user) {
            checkAdminAndFetchData();
        }
    }, [user, router]);

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm("Are you sure you want to delete this course?")) return;
        try {
            await deleteDoc(doc(db, "courses", courseId));
            setCourses(courses.filter((c) => c.id !== courseId));
        } catch (error) {
            console.error("Error deleting course:", error);
        }
    };

    const handleToggleApproval = async (courseId: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "courses", courseId), {
                isApproved: !currentStatus,
            });
            setCourses(
                courses.map((c) =>
                    c.id === courseId ? { ...c, isApproved: !currentStatus } : c
                )
            );
        } catch (error) {
            console.error("Error updating course:", error);
        }
    };

    if (loading || loadingData) {
        return (
            <div className="min-h-screen bg-comic-paper flex items-center justify-center">
                <div className="text-2xl font-black">Loading Admin HQ... 🕵️</div>
            </div>
        );
    }

    if (userRole !== "admin") {
        return null;
    }

    const filteredUsers = users.filter(
        (u) =>
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCourses = courses.filter((c) =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-comic-paper bg-grid-pattern">

            {/* Header */}
            <header className="bg-white border-b-[3px] border-comic-ink py-4 px-6 sticky top-0 z-50">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-black border-2 border-gray-800">
                            HQ
                        </div>
                        <h1 className="text-xl font-black uppercase tracking-wider">Admin Control</h1>
                    </div>
                    <Link href="/dashboard">
                        <button className="font-bold hover:underline">Exit to Dashboard</button>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="comic-box p-6 bg-white flex items-center gap-4">
                        <Users className="w-10 h-10 text-comic-blue" />
                        <div>
                            <p className="font-bold text-gray-500 uppercase text-xs">Total Users</p>
                            <p className="text-3xl font-black">{users.length}</p>
                        </div>
                    </div>
                    <div className="comic-box p-6 bg-white flex items-center gap-4">
                        <BookOpen className="w-10 h-10 text-comic-yellow-dark" />
                        <div>
                            <p className="font-bold text-gray-500 uppercase text-xs">Total Courses</p>
                            <p className="text-3xl font-black">{courses.length}</p>
                        </div>
                    </div>
                    <div className="comic-box p-6 bg-white flex items-center gap-4">
                        <Activity className="w-10 h-10 text-comic-green" />
                        <div>
                            <p className="font-bold text-gray-500 uppercase text-xs">System Status</p>
                            <p className="text-3xl font-black text-green-500">ONLINE</p>
                        </div>
                    </div>
                </div>

                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div className="flex gap-2 bg-white p-1 rounded-xl border-2 border-comic-ink shadow-sm">
                        <button
                            onClick={() => setActiveTab("users")}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'users' ? 'bg-comic-ink text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Users
                        </button>
                        <button
                            onClick={() => setActiveTab("courses")}
                            className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'courses' ? 'bg-comic-ink text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Courses
                        </button>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="comic-input w-full bg-white !py-2 !pl-10 h-12"
                        />
                    </div>
                </div>

                {/* Content Table */}
                <div className="comic-box bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b-2 border-comic-ink">
                                <tr>
                                    {activeTab === 'users' ? (
                                        <>
                                            <th className="p-4 text-left font-black uppercase tracking-wider text-sm">User</th>
                                            <th className="p-4 text-left font-black uppercase tracking-wider text-sm">Role</th>
                                            <th className="p-4 text-left font-black uppercase tracking-wider text-sm">Stats</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-4 text-left font-black uppercase tracking-wider text-sm">Title</th>
                                            <th className="p-4 text-left font-black uppercase tracking-wider text-sm">Status</th>
                                            <th className="p-4 text-left font-black uppercase tracking-wider text-sm">Actions</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeTab === 'users' ? (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-yellow-50/50">
                                            <td className="p-4">
                                                <div className="font-bold">{u.displayName || "Unknown"}</div>
                                                <div className="text-sm text-gray-400">{u.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded border-2 text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-sm">
                                                Lvl {u.stats?.level || 1} • {u.stats?.xp || 0} XP
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    filteredCourses.map((c) => (
                                        <tr key={c.id} className="hover:bg-yellow-50/50">
                                            <td className="p-4 font-bold">
                                                {c.title}
                                                <div className="text-xs text-gray-400 font-normal">{c.id}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded border-2 text-xs font-bold uppercase ${c.isApproved ? 'bg-green-100 border-green-400 text-green-700' : 'bg-yellow-100 border-yellow-400 text-yellow-700'}`}>
                                                    {c.isApproved ? "Approved" : "Pending"}
                                                </span>
                                            </td>
                                            <td className="p-4 flex gap-2">
                                                <button
                                                    onClick={() => handleToggleApproval(c.id, c.isApproved)}
                                                    className="p-2 border-2 rounded hover:bg-gray-100 transition-colors"
                                                    title={c.isApproved ? "Reject" : "Approve"}
                                                >
                                                    {c.isApproved ? <Ban className="w-4 h-4 text-red-500" /> : <Check className="w-4 h-4 text-green-500" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCourse(c.id)}
                                                    className="p-2 border-2 border-red-200 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {((activeTab === 'users' && filteredUsers.length === 0) || (activeTab === 'courses' && filteredCourses.length === 0)) && (
                            <div className="p-8 text-center text-gray-400 font-bold">
                                No records found.
                            </div>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
