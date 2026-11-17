
"use client";

import { useState } from "react";
import {
  Search,
  MapPin,
  Navigation,
  GraduationCap,
  Coffee,
  Building2,
  BookOpen,
  Hospital,
  Home,
  Menu,
  LocateFixed,
  ArrowUpRight,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

const CampusMap = dynamic(
  () => import("@/components/CampusMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] md:h-[570px] flex items-center justify-center bg-slate-100">
        Loading campus map...
      </div>
    ),
  }
);

const categories = [
  { name: "Academic Blocks", icon: Building2 },
  { name: "Hostels", icon: Home },
  { name: "Library", icon: BookOpen },
  { name: "Food Courts", icon: Coffee },
  { name: "Medical", icon: Hospital },
];

const places = [
  { name: "Central Library", category: "Library", query: "Central Library LPU Phagwara" },
  { name: "Block 30 - Admissions", category: "Academic Blocks", query: "Block 30 LPU Phagwara" },
  { name: "Boys Hostel 1", category: "Hostels", query: "Boys Hostel 1 LPU Phagwara" },
  { name: "Uni Mall", category: "Food Courts", query: "Uni Mall LPU Phagwara" },
  { name: "Uni Hospital", category: "Medical", query: "Uni Hospital LPU Phagwara" },
  { name: "Shanti Devi Mittal Auditorium", category: "Academic Blocks", query: "Shanti Devi Mittal Auditorium LPU" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [category, setCategory] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredPlaces = places.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || place.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">

      {/* Navbar */}
      <nav className="h-[76px] bg-white border-b border-slate-200 px-5 md:px-12 flex items-center justify-between relative z-[1000]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-700 text-white flex items-center justify-center">
            <GraduationCap size={26} />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight">
              LPU<span className="text-red-700">Navigator</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-[2px] uppercase">
              Campus Navigation
            </p>
          </div>
        </div>

        <div className="hidden md:flex gap-8 items-center text-sm font-medium">
          <a href="#explore" className="hover:text-red-700">Explore</a>
          <a href="#map" className="hover:text-red-700">Campus Map</a>
          <a href="#about" className="hover:text-red-700">About</a>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        {menuOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-lg p-5 flex flex-col gap-4 md:hidden">
            <a href="#explore" onClick={() => setMenuOpen(false)}>Explore</a>
            <a href="#map" onClick={() => setMenuOpen(false)}>Campus Map</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="bg-[#171b27] text-white px-5 md:px-16 py-14 md:py-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-red-400 text-xs tracking-[3px] font-bold uppercase">
              Lovely Professional University
            </span>

            <h2 className="text-4xl md:text-6xl font-bold leading-tight mt-5">
              Your Campus.
              <br />
              Your <span className="text-red-400">Direction.</span>
            </h2>

            <p className="text-slate-300 mt-6 max-w-lg leading-7">
              Explore LPU with ease. Discover academic blocks, hostels,
              libraries, food courts and everything around your campus.
            </p>

            <a
              href="#map"
              className="inline-flex items-center gap-2 mt-8 bg-red-700 hover:bg-red-800 px-6 py-3 rounded-xl font-semibold transition"
            >
              Explore Campus <ArrowUpRight size={18} />
            </a>
          </div>

          <div className="rounded-3xl overflow-hidden border border-white/10 bg-white/5 p-3">
            <div className="rounded-2xl bg-gradient-to-br from-red-900 via-slate-800 to-slate-950 p-8 md:p-12 min-h-[250px] flex flex-col justify-between">
              <MapPin size={42} className="text-red-400" />
              <div>
                <p className="text-3xl font-bold">One Campus.</p>
                <p className="text-3xl font-bold text-red-400">Every Destination.</p>
                <p className="text-sm text-slate-300 mt-3">
                  Phagwara, Punjab, India
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search and map */}
      <section id="map" className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-8">
          <p className="text-red-700 text-xs font-bold tracking-[3px] uppercase">
            Find your way
          </p>
          <h2 className="text-3xl font-bold mt-2">Where do you want to go?</h2>
          <p className="text-slate-500 mt-2">
            Search a campus destination and explore the map.
          </p>
        </div>

        <div className="grid lg:grid-cols-[350px_1fr] gap-5">

          {/* Sidebar */}
          <aside className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-4 text-slate-400" size={19} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blocks, hostels..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-100 outline-none focus:ring-2 focus:ring-red-500 text-sm"
              />
            </div>

            <div className="mt-6">
              <h3 className="font-bold text-sm mb-3">Explore Categories</h3>
              <div className="flex flex-wrap gap-2">
                {["All", ...categories.map((c) => c.name)].map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      category === item
                        ? "bg-red-700 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <h3 className="font-bold text-sm mb-4">
                Popular Destinations
              </h3>

              <div className="space-y-2">
                {filteredPlaces.map((place) => (
                  <button
                    key={place.name}
                    onClick={() => setDestination(place.query)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      destination === place.query
                        ? "border-red-500 bg-red-50"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                        <MapPin size={19} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{place.name}</p>
                        <p className="text-xs text-slate-500">{place.category}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-400" />
                    </div>
                  </button>
                ))}

                {filteredPlaces.length === 0 && (
                  <p className="text-sm text-slate-500 py-4">
                    No matching destinations found.
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* Map and directions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-5 flex flex-col sm:flex-row justify-between gap-3">
              <div>
                <h3 className="font-bold">Interactive Campus Map</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Lovely Professional University, Phagwara
                </p>
              </div>
              <button
                onClick={() => {
                  setStart("");
                  setDestination("");
                }}
                className="text-xs font-semibold text-red-700 flex items-center gap-2"
              >
                <LocateFixed size={16} /> Reset
              </button>
            </div>

            <CampusMap
  destination={destination}
  start={start}
  onDestination={setDestination}
  onStart={setStart}
/>

            <div className="p-4 border-t border-slate-100 grid sm:grid-cols-2 gap-3">
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="Starting point (e.g. BH1)"
                className="bg-slate-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination (e.g. Central Library)"
                className="bg-slate-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Explore section */}
      <section id="explore" className="max-w-7xl mx-auto px-5 md:px-8 py-12">
        <p className="text-red-700 text-xs font-bold tracking-[3px] uppercase">
          Campus discovery
        </p>
        <h2 className="text-3xl font-bold mt-2 mb-8">Explore LPU</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => {
                setCategory(name);
                document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-red-400 hover:shadow-md transition text-left"
            >
              <Icon size={28} className="text-red-700 mb-5" />
              <p className="font-bold text-sm">{name}</p>
              <p className="text-xs text-slate-500 mt-2">Explore locations</p>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="bg-[#171b27] text-white px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-5">
          <div>
            <h2 className="font-bold text-xl">
              LPU<span className="text-red-400">Navigator</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Making every campus journey easier.
            </p>
          </div>
          <div className="text-sm text-slate-400">
            Lovely Professional University
            <br />
            Phagwara, Punjab, India
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-8 pt-5 text-xs text-slate-500">
          © 2026 LPU Navigator. Independent student project. Not an official LPU website.
        </div>
      </footer>
    </main>
  );
}
