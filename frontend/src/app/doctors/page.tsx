"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { Search, Filter, Star, Clock, MapPin, Languages, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BackendDoctor = {
  id: number;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: string;
  };
  specialization: string;
  bmdc_number: string;
  consultation_fee: string;
  is_available: boolean;
  verification_status: string;
};

function mapBackendDoctorToFrontend(backendDoc: BackendDoctor): any {
  const mockMapping: Record<string, { rating: number; reviews: number; experience: string; languages: string[]; location: string; imageUrl: string }> = {
    "cardiology": {
      rating: 4.9,
      reviews: 142,
      experience: "15 Years",
      languages: ["Bengali", "English"],
      location: "Sylhet",
      imageUrl: "https://picsum.photos/seed/doc3/400/400"
    },
    "pediatrics": {
      rating: 4.8,
      reviews: 96,
      experience: "8 Years",
      languages: ["Bengali", "English"],
      location: "Chittagong",
      imageUrl: "https://picsum.photos/seed/doc2/400/400"
    },
    "general physician": {
      rating: 4.7,
      reviews: 110,
      experience: "12 Years",
      languages: ["Bengali", "English"],
      location: "Dhaka",
      imageUrl: "https://picsum.photos/seed/doc1/400/400"
    }
  };

  const key = backendDoc.specialization.toLowerCase();
  const mockDetails = mockMapping[key] || {
    rating: 4.6,
    reviews: 45,
    experience: "5 Years",
    languages: ["Bengali"],
    location: "Dhaka",
    imageUrl: "https://picsum.photos/seed/docgeneric/400/400"
  };

  return {
    id: String(backendDoc.user.id),
    name: backendDoc.user.full_name.startsWith("Dr.") ? backendDoc.user.full_name : `Dr. ${backendDoc.user.full_name}`,
    specialization: backendDoc.specialization,
    experience: mockDetails.experience,
    rating: mockDetails.rating,
    reviews: mockDetails.reviews,
    fee: `৳ ${parseFloat(backendDoc.consultation_fee).toFixed(0)}`,
    availability: backendDoc.is_available ? "Available Today" : "Offline",
    imageUrl: mockDetails.imageUrl,
    languages: mockDetails.languages,
    location: mockDetails.location,
    bmdcNumber: backendDoc.bmdc_number
  };
}

export default function DoctorsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [specializations, setSpecializations] = useState<string[]>(["All", "General Physician", "Pediatrics", "Cardiology", "Gynecology"]);

  // Load dynamic specializations on mount
  useEffect(() => {
    async function fetchSpecialties() {
      try {
        const res = await api.get("/api/v1/auth/doctors/specializations/");
        const list = res.data || res;
        if (Array.isArray(list)) {
          setSpecializations(["All", ...list]);
        }
      } catch (err) {
        console.error("Failed to load specialties", err);
      }
    }
    fetchSpecialties();
  }, []);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        setLoading(true);
        let url = `/api/v1/auth/doctors/`;
        const params = [];
        
        if (filter !== "All") {
          params.push(`specialization=${encodeURIComponent(filter)}`);
        }
        if (search) {
          params.push(`search=${encodeURIComponent(search)}`);
        }
        
        // Request pagination parameters
        params.push(`page=${page}`);
        params.push(`page_size=4`);

        if (params.length > 0) {
          url += `?${params.join("&")}`;
        }

        const res = await api.get(url);
        const paginatedData = res.data;

        if (paginatedData && Array.isArray(paginatedData.results)) {
          setDoctors(paginatedData.results.map(mapBackendDoctorToFrontend));
          setTotalPages(paginatedData.total_pages || 1);
        } else {
          setDoctors([]);
          setTotalPages(1);
        }
      } catch (err) {
        console.error("Failed to fetch backend doctors", err);
        setDoctors([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    // 300ms Debounce to prevent flooding the backend DB on fast keystrokes
    const handler = setTimeout(() => {
      fetchDoctors();
    }, 300);

    return () => clearTimeout(handler);
  }, [filter, search, page]);

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 md:pt-24 min-h-screen">
        <header className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold mb-4">Consult Verified Doctors</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <Input 
                placeholder="Name or specialty..." 
                className="pl-10 md:pl-12 h-12 md:h-14 rounded-xl md:rounded-2xl border-none shadow-sm text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white border-none shadow-sm shrink-0">
              <Filter className="w-5 h-5 text-slate-500" />
            </Button>
          </div>
        </header>

        {/* Specialty Filter */}
        <div className="flex overflow-x-auto gap-2 md:gap-3 pb-4 no-scrollbar mb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => setFilter(spec)}
              className={cn(
                "whitespace-nowrap px-4 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all border",
                filter === spec 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                  : "bg-white text-slate-600 border-slate-100 shadow-sm"
              )}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Querying active medical registries...</p>
          </div>
        ) : (
          /* Doctor Cards */
          <div className="space-y-4 md:space-y-6">
            {doctors.map((doc) => (
              <Card key={doc.id} className="rounded-2xl md:rounded-[2rem] border-none shadow-md overflow-hidden bg-white hover:shadow-xl transition-all border border-transparent hover:border-primary/10">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-48 h-40 md:h-auto relative shrink-0">
                      <img src={doc.imageUrl} alt={doc.name} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3">
                        <div className="bg-accent text-white border-none px-2 py-1 rounded-full flex items-center gap-1 shadow-lg text-[10px] font-bold">
                          <Star className="w-3 h-3 fill-white" /> {doc.rating}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h3 className="text-base md:text-xl font-bold text-slate-900 truncate">{doc.name}</h3>
                              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-primary shrink-0" />
                            </div>
                            <p className="text-[10px] md:text-sm font-bold text-primary uppercase tracking-widest truncate">{doc.specialization}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base md:text-xl font-bold text-slate-900 leading-tight">{doc.fee}</div>
                            <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fee</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 md:gap-y-3 gap-x-4 mt-3">
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] md:text-sm">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.experience}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] md:text-sm">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] md:text-sm col-span-2">
                            <Languages className="w-3 h-3 md:w-4 md:h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{doc.languages.join(", ")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 md:mt-6 flex gap-2">
                        <Link href={`/doctors/${doc.id}`} className="flex-1">
                          <Button variant="outline" className="w-full h-10 md:h-12 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm">Profile</Button>
                        </Link>
                        <Link href={`/consultation/new?doc=${doc.id}`} className="flex-1">
                          <Button className="w-full h-10 md:h-12 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-lg shadow-primary/10">Book Now</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                  className="rounded-xl h-10 px-4 font-bold text-xs shadow-sm bg-white"
                >
                  Previous
                </Button>
                
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Page {page} of {totalPages}
                </span>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                  className="rounded-xl h-10 px-4 font-bold text-xs shadow-sm bg-white"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {!loading && doctors.length === 0 && (
          <div className="text-center py-16 md:py-20">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-600">No doctors found</h3>
            <p className="text-sm text-slate-400 mt-1">Try another name or specialty.</p>
          </div>
        )}
      </div>
    </div>
  );
}