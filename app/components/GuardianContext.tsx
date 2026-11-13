'use client';
import {createContext,useContext} from 'react';
export const GuardianContext=createContext(false);
export const useGuardianView=()=>useContext(GuardianContext);
