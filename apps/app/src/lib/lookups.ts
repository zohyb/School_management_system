import { useEffect, useState } from "react";
import { get } from "./api";

export interface AcademicYear { id: number; title: string; is_active: number }
export interface Class { id: number; name: string; numeric_value: number }
export interface Section { id: number; class_id: number; name: string }
export interface Subject { id: number; name: string; code: string | null }
export interface Teacher { id: number; name: string }

export function useAcademicYears() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  useEffect(() => {
    get<{ data: AcademicYear[] }>("/api/school/academic-years?per=50").then((d) => setYears(d.data)).catch(() => {});
  }, []);
  const active = years.find((y) => y.is_active === 1) ?? years[0];
  return { years, active };
}

export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  useEffect(() => {
    get<{ data: Class[] }>("/api/school/classes?per=100").then((d) => setClasses(d.data)).catch(() => {});
  }, []);
  return classes;
}

export function useSections(classId?: number) {
  const [sections, setSections] = useState<Section[]>([]);
  useEffect(() => {
    get<{ data: Section[] }>("/api/school/sections?per=100").then((d) => setSections(d.data)).catch(() => {});
  }, []);
  return classId ? sections.filter((s) => s.class_id === classId) : sections;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  useEffect(() => {
    get<{ data: Subject[] }>("/api/school/subjects?per=200").then((d) => setSubjects(d.data)).catch(() => {});
  }, []);
  return subjects;
}

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  useEffect(() => {
    get<{ data: Teacher[] }>("/api/school/teachers?per=200").then((d) => setTeachers(d.data)).catch(() => {});
  }, []);
  return teachers;
}
