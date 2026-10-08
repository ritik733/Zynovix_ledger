'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Category,
  Person,
  Transaction,
  Settlement,
  PersonSummary,
  AgeingAnalysis,
  AccountBalanceSummary,
} from '@/types';
import {
  enrichTransactions,
  calculatePersonSummaries,
  calculateAgeingAnalysis,
  calculateAccountBalanceSummary,
} from './financial-logic';
import { getSampleInitialData } from './seed-data';
import { getSupabaseEnv } from './supabase/config';
import { createClient } from './supabase/client';
import { DEFAULT_CATEGORIES } from './constants';

interface StoreContextType {
  isSupabaseConfigured: boolean;
  isSupabaseConnected: boolean;
  currentUser: { id: string; email?: string; name?: string } | null;
  currency: string;
  setCurrency: (c: string) => void;
  isLoading: boolean;
  error: string | null;

  categories: Category[];
  people: Person[];
  transactions: Transaction[];
  settlements: Settlement[];

  // Computed state
  enrichedTransactions: Transaction[];
  personSummaries: PersonSummary[];
  ageingAnalysis: AgeingAnalysis;
  accountBalanceSummary: AccountBalanceSummary;

  // Actions
  addTransaction: (data: {
    type: 'expense' | 'borrow' | 'lending';
    amount: number;
    transaction_date: string;
    person_id?: string | null;
    category_id?: string | null;
    payment_method?: string | null;
    remark: string;
    notes?: string | null;
  }) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;

  updateTransaction: (
    id: string,
    data: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
  ) => Promise<{ success: boolean; error?: string }>;

  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;

  addSettlement: (data: {
    transaction_id: string;
    amount: number;
    settlement_date: string;
    payment_method?: string | null;
    remark: string;
  }) => Promise<{ success: boolean; error?: string; settlement?: Settlement }>;

  deleteSettlement: (id: string) => Promise<{ success: boolean; error?: string }>;

  addPerson: (data: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string; person?: Person }>;

  updatePerson: (
    id: string,
    data: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>
  ) => Promise<{ success: boolean; error?: string }>;

  deletePerson: (id: string) => Promise<{ success: boolean; error?: string }>;

  addCategory: (data: { name: string; icon?: string; color?: string }) => Promise<{ success: boolean; error?: string }>;

  loadSeedScenarios: () => void;
  resetAllData: () => void;
  exportDataToJSON: () => string;
  importDataFromJSON: (json: string) => boolean;

  // Global Add Transaction Modal State
  isAddModalOpen: boolean;
  addModalType: 'expense' | 'borrow' | 'lending' | 'repayment';
  addModalPersonId?: string;
  addModalTransactionId?: string;
  openAddModal: (
    type?: 'expense' | 'borrow' | 'lending' | 'repayment',
    personId?: string,
    transactionId?: string
  ) => void;
  closeAddModal: () => void;

  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEY = 'zynovix_accounts_ledger_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [currency, setCurrency] = useState<string>('₹');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // Global modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addModalType, setAddModalType] = useState<
    'expense' | 'borrow' | 'lending' | 'repayment'
  >('expense');
  const [addModalPersonId, setAddModalPersonId] = useState<string | undefined>(undefined);
  const [addModalTransactionId, setAddModalTransactionId] = useState<string | undefined>(undefined);

  const openAddModal = useCallback(
    (
      type: 'expense' | 'borrow' | 'lending' | 'repayment' = 'expense',
      personId?: string,
      transactionId?: string
    ) => {
      setAddModalType(type);
      setAddModalPersonId(personId);
      setAddModalTransactionId(transactionId);
      setIsAddModalOpen(true);
    },
    []
  );

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  // Check Supabase configuration and setup auth
  useEffect(() => {
    const env = getSupabaseEnv();
    setIsSupabaseConfigured(env.isConfigured);

    if (env.isConfigured) {
      const supabase = createClient();
      if (supabase) {
        // Check current session
        supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
          if (!sessionError && session?.user) {
            setCurrentUser({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            });
            setIsSupabaseConnected(true);
            fetchSupabaseData(session.user.id);
          } else {
            // Not logged in to Supabase yet, load local storage
            loadFromLocalStorage();
          }
        });

        // Listen for auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setCurrentUser({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            });
            setIsSupabaseConnected(true);
            fetchSupabaseData(session.user.id);
          } else {
            setCurrentUser(null);
            setIsSupabaseConnected(false);
            loadFromLocalStorage();
          }
        });

        return () => {
          authListener?.subscription.unsubscribe();
        };
      }
    } else {
      // Local mode
      loadFromLocalStorage();
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    try {
      setIsLoading(true);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCategories(parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES);
        setPeople(parsed.people || []);
        setTransactions(parsed.transactions || []);
        setSettlements(parsed.settlements || []);
        if (parsed.currency) setCurrency(parsed.currency);
      } else {
        // First time initialization: populate sample scenario test data!
        const initial = getSampleInitialData('local-user');
        setCategories(initial.categories);
        setPeople(initial.people);
        setTransactions(initial.transactions);
        setSettlements(initial.settlements);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            categories: initial.categories,
            people: initial.people,
            transactions: initial.transactions,
            settlements: initial.settlements,
            currency: '₹',
          })
        );
      }
    } catch (err: any) {
      console.error('Failed to load local storage:', err);
      const initial = getSampleInitialData('local-user');
      setCategories(initial.categories);
      setPeople(initial.people);
      setTransactions(initial.transactions);
      setSettlements(initial.settlements);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to local storage when state changes (if not Supabase connected or as local cache)
  const saveToLocalStorage = useCallback(
    (newCategories: Category[], newPeople: Person[], newTransactions: Transaction[], newSettlements: Settlement[]) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            categories: newCategories,
            people: newPeople,
            transactions: newTransactions,
            settlements: newSettlements,
            currency,
          })
        );
      } catch (err) {
        console.error('Failed to persist to local storage:', err);
      }
    },
    [currency]
  );

  // Fetch Supabase data for authenticated user
  const fetchSupabaseData = async (userId: string) => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      if (!supabase) return;

      const [peopleRes, catRes, txRes, setRes] = await Promise.all([
        supabase.from('people').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('transactions').select('*').eq('is_deleted', false).order('transaction_date', { ascending: false }),
        supabase.from('settlements').select('*').eq('is_deleted', false).order('settlement_date', { ascending: false }),
      ]);

      if (peopleRes.data) setPeople(peopleRes.data);
      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
      if (txRes.data) setTransactions(txRes.data);
      if (setRes.data) setSettlements(setRes.data);
    } catch (err: any) {
      console.error('Error fetching Supabase data:', err);
      setError(err.message || 'Error loading data from Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // ----------------------------------------------------------------------------
  // COMPUTED VALUES
  // ----------------------------------------------------------------------------
  const enrichedTransactions = useMemo(() => {
    return enrichTransactions(
      transactions,
      settlements,
      people,
      categories,
      currentDate || undefined
    );
  }, [transactions, settlements, people, categories, currentDate]);

  const personSummaries = useMemo(() => {
    return calculatePersonSummaries(people, enrichedTransactions);
  }, [people, enrichedTransactions]);

  const ageingAnalysis = useMemo(() => {
    return calculateAgeingAnalysis(enrichedTransactions);
  }, [enrichedTransactions]);

  const accountBalanceSummary = useMemo(() => {
    return calculateAccountBalanceSummary(personSummaries, enrichedTransactions);
  }, [personSummaries, enrichedTransactions]);

  // ----------------------------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------------------------

  const addTransaction = async (data: {
    type: 'expense' | 'borrow' | 'lending';
    amount: number;
    transaction_date: string;
    person_id?: string | null;
    category_id?: string | null;
    payment_method?: string | null;
    remark: string;
    notes?: string | null;
  }) => {
    // 1. Mandatory validations
    if (!data.amount || Number(data.amount) <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    if (!data.remark || data.remark.trim().length === 0) {
      return { success: false, error: 'Remark is mandatory for every transaction.' };
    }
    if ((data.type === 'borrow' || data.type === 'lending') && !data.person_id) {
      return { success: false, error: 'Person is required for Borrow and Lending transactions.' };
    }

    const userId = currentUser?.id || 'local-user';
    const newTx: Transaction = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      type: data.type,
      amount: Number(data.amount),
      transaction_date: data.transaction_date,
      person_id: data.person_id || null,
      category_id: data.category_id || null,
      payment_method: data.payment_method || null,
      remark: data.remark.trim(),
      notes: data.notes?.trim() || null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // If Supabase is active, persist to database
    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { data: inserted, error: sbError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            type: data.type,
            amount: Number(data.amount),
            transaction_date: data.transaction_date,
            person_id: data.person_id || null,
            category_id: data.category_id || null,
            payment_method: data.payment_method || null,
            remark: data.remark.trim(),
            notes: data.notes?.trim() || null,
          })
          .select()
          .single();

        if (sbError) {
          return { success: false, error: sbError.message };
        }
        if (inserted) {
          newTx.id = inserted.id;
        }
      }
    }

    const nextTxs = [newTx, ...transactions];
    setTransactions(nextTxs);
    saveToLocalStorage(categories, people, nextTxs, settlements);

    return { success: true, transaction: newTx };
  };

  const updateTransaction = async (
    id: string,
    data: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at'>>
  ) => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return { success: false, error: 'Transaction not found.' };

    if (data.amount !== undefined && Number(data.amount) <= 0) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    if (data.remark !== undefined && data.remark.trim().length === 0) {
      return { success: false, error: 'Remark is mandatory and cannot be empty.' };
    }

    // Verify amount against settlements
    const txSettlements = settlements.filter((s) => s.transaction_id === id && !s.is_deleted);
    const totalSettled = txSettlements.reduce((sum, s) => sum + s.amount, 0);
    const newAmount = data.amount !== undefined ? Number(data.amount) : existing.amount;

    if (existing.type !== 'expense' && newAmount < totalSettled) {
      return {
        success: false,
        error: `Cannot reduce amount below already settled amount (₹${totalSettled.toLocaleString('en-IN')}).`,
      };
    }

    const updatedTx: Transaction = {
      ...existing,
      ...data,
      amount: newAmount,
      remark: data.remark !== undefined ? data.remark.trim() : existing.remark,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase
          .from('transactions')
          .update({
            type: updatedTx.type,
            amount: updatedTx.amount,
            transaction_date: updatedTx.transaction_date,
            person_id: updatedTx.person_id,
            category_id: updatedTx.category_id,
            payment_method: updatedTx.payment_method,
            remark: updatedTx.remark,
            notes: updatedTx.notes,
            updated_at: updatedTx.updated_at,
          })
          .eq('id', id);

        if (sbError) return { success: false, error: sbError.message };
      }
    }

    const nextTxs = transactions.map((t) => (t.id === id ? updatedTx : t));
    setTransactions(nextTxs);
    saveToLocalStorage(categories, people, nextTxs, settlements);

    return { success: true };
  };

  const deleteTransaction = async (id: string) => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return { success: false, error: 'Transaction not found.' };

    // Soft delete
    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase
          .from('transactions')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (sbError) return { success: false, error: sbError.message };
      }
    }

    const nextTxs = transactions.filter((t) => t.id !== id);
    // Also mark related settlements as deleted to prevent orphan states
    const nextSets = settlements.filter((s) => s.transaction_id !== id);

    setTransactions(nextTxs);
    setSettlements(nextSets);
    saveToLocalStorage(categories, people, nextTxs, nextSets);

    return { success: true };
  };

  const addSettlement = async (data: {
    transaction_id: string;
    amount: number;
    settlement_date: string;
    payment_method?: string | null;
    remark: string;
  }) => {
    if (!data.amount || Number(data.amount) <= 0) {
      return { success: false, error: 'Settlement amount must be greater than 0.' };
    }
    if (!data.remark || data.remark.trim().length === 0) {
      return { success: false, error: 'Remark is mandatory for settlements/repayments.' };
    }

    const targetTx = enrichedTransactions.find((t) => t.id === data.transaction_id);
    if (!targetTx) {
      return { success: false, error: 'Original transaction not found.' };
    }

    const pending = targetTx.pending_amount || 0;
    if (Number(data.amount) > pending) {
      return {
        success: false,
        error: `Settlement amount (₹${Number(data.amount).toLocaleString(
          'en-IN'
        )}) cannot exceed remaining pending amount (₹${pending.toLocaleString('en-IN')}).`,
      };
    }

    const userId = currentUser?.id || 'local-user';
    const newSettlement: Settlement = {
      id: 'stl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      transaction_id: data.transaction_id,
      amount: Number(data.amount),
      settlement_date: data.settlement_date,
      payment_method: data.payment_method || null,
      remark: data.remark.trim(),
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { data: inserted, error: sbError } = await supabase
          .from('settlements')
          .insert({
            user_id: userId,
            transaction_id: data.transaction_id,
            amount: Number(data.amount),
            settlement_date: data.settlement_date,
            payment_method: data.payment_method || null,
            remark: data.remark.trim(),
          })
          .select()
          .single();

        if (sbError) return { success: false, error: sbError.message };
        if (inserted) newSettlement.id = inserted.id;
      }
    }

    const nextSets = [newSettlement, ...settlements];
    setSettlements(nextSets);
    saveToLocalStorage(categories, people, transactions, nextSets);

    return { success: true, settlement: newSettlement };
  };

  const deleteSettlement = async (id: string) => {
    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase
          .from('settlements')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (sbError) return { success: false, error: sbError.message };
      }
    }

    const nextSets = settlements.filter((s) => s.id !== id);
    setSettlements(nextSets);
    saveToLocalStorage(categories, people, transactions, nextSets);
    return { success: true };
  };

  const addPerson = async (data: {
    name: string;
    phone?: string;
    email?: string;
    notes?: string;
  }) => {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { success: false, error: 'Person name is required.' };
    }

    // Check duplicate name
    const exists = people.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return { success: false, error: `A person named "${trimmedName}" already exists.` };
    }

    const userId = currentUser?.id || 'local-user';
    const newPerson: Person = {
      id: 'person-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      name: trimmedName,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { data: inserted, error: sbError } = await supabase
          .from('people')
          .insert({
            user_id: userId,
            name: trimmedName,
            phone: data.phone?.trim() || null,
            email: data.email?.trim() || null,
            notes: data.notes?.trim() || null,
          })
          .select()
          .single();

        if (sbError) return { success: false, error: sbError.message };
        if (inserted) newPerson.id = inserted.id;
      }
    }

    const nextPeople = [...people, newPerson].sort((a, b) => a.name.localeCompare(b.name));
    setPeople(nextPeople);
    saveToLocalStorage(categories, nextPeople, transactions, settlements);

    return { success: true, person: newPerson };
  };

  const updatePerson = async (
    id: string,
    data: Partial<Omit<Person, 'id' | 'user_id' | 'created_at'>>
  ) => {
    const existing = people.find((p) => p.id === id);
    if (!existing) return { success: false, error: 'Person not found.' };

    if (data.name) {
      const trimmedName = data.name.trim();
      const duplicate = people.some(
        (p) => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `Another person named "${trimmedName}" already exists.` };
      }
    }

    const updatedPerson: Person = {
      ...existing,
      ...data,
      name: data.name ? data.name.trim() : existing.name,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase
          .from('people')
          .update({
            name: updatedPerson.name,
            phone: updatedPerson.phone,
            email: updatedPerson.email,
            notes: updatedPerson.notes,
            updated_at: updatedPerson.updated_at,
          })
          .eq('id', id);

        if (sbError) return { success: false, error: sbError.message };
      }
    }

    const nextPeople = people.map((p) => (p.id === id ? updatedPerson : p));
    setPeople(nextPeople);
    saveToLocalStorage(categories, nextPeople, transactions, settlements);
    return { success: true };
  };

  const deletePerson = async (id: string) => {
    const hasTransactions = transactions.some((t) => t.person_id === id && !t.is_deleted);
    if (hasTransactions) {
      return {
        success: false,
        error: 'Cannot delete person with existing transactions. Delete or reassign their transactions first.',
      };
    }

    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { error: sbError } = await supabase.from('people').delete().eq('id', id);
        if (sbError) return { success: false, error: sbError.message };
      }
    }

    const nextPeople = people.filter((p) => p.id !== id);
    setPeople(nextPeople);
    saveToLocalStorage(categories, nextPeople, transactions, settlements);
    return { success: true };
  };

  const addCategory = async (data: { name: string; icon?: string; color?: string }) => {
    const trimmed = data.name.trim();
    if (!trimmed) return { success: false, error: 'Category name is required.' };

    const exists = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return { success: false, error: `Category "${trimmed}" already exists.` };

    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: trimmed,
      icon: data.icon || 'Folder',
      color: data.color || '#3B82F6',
      is_system: false,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConnected && currentUser) {
      const supabase = createClient();
      if (supabase) {
        const { data: inserted, error: sbError } = await supabase
          .from('categories')
          .insert({
            user_id: currentUser.id,
            name: trimmed,
            icon: newCat.icon,
            color: newCat.color,
            is_system: false,
          })
          .select()
          .single();
        if (sbError) return { success: false, error: sbError.message };
        if (inserted) newCat.id = inserted.id;
      }
    }

    const nextCats = [...categories, newCat];
    setCategories(nextCats);
    saveToLocalStorage(nextCats, people, transactions, settlements);
    return { success: true };
  };

  const loadSeedScenarios = () => {
    const seed = getSampleInitialData(currentUser?.id || 'local-user');
    setCategories(seed.categories);
    setPeople(seed.people);
    setTransactions(seed.transactions);
    setSettlements(seed.settlements);
    saveToLocalStorage(seed.categories, seed.people, seed.transactions, seed.settlements);
  };

  const resetAllData = () => {
    setPeople([]);
    setTransactions([]);
    setSettlements([]);
    setCategories(DEFAULT_CATEGORIES);
    localStorage.removeItem(STORAGE_KEY);
  };

  const exportDataToJSON = () => {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        categories,
        people,
        transactions,
        settlements,
      },
      null,
      2
    );
  };

  const importDataFromJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.transactions)) {
        setCategories(parsed.categories || DEFAULT_CATEGORIES);
        setPeople(parsed.people || []);
        setTransactions(parsed.transactions || []);
        setSettlements(parsed.settlements || []);
        saveToLocalStorage(
          parsed.categories || DEFAULT_CATEGORIES,
          parsed.people || [],
          parsed.transactions || [],
          parsed.settlements || []
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Auth wrappers
  const signInWithEmail = async (email: string, password: string) => {
    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase client not configured.' };

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return { success: false, error: authError.message };
    return { success: true };
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const supabase = createClient();
    if (!supabase) return { success: false, error: 'Supabase client not configured.' };

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || email.split('@')[0] },
      },
    });
    if (authError) return { success: false, error: authError.message };
    return { success: true };
  };

  const signOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setIsSupabaseConnected(false);
    loadFromLocalStorage();
  };

  return (
    <StoreContext.Provider
      value={{
        isSupabaseConfigured,
        isSupabaseConnected,
        currentUser,
        currency,
        setCurrency,
        isLoading,
        error,
        categories,
        people,
        transactions,
        settlements,
        enrichedTransactions,
        personSummaries,
        ageingAnalysis,
        accountBalanceSummary,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addSettlement,
        deleteSettlement,
        addPerson,
        updatePerson,
        deletePerson,
        addCategory,
        loadSeedScenarios,
        resetAllData,
        exportDataToJSON,
        importDataFromJSON,
        isAddModalOpen,
        addModalType,
        addModalPersonId,
        addModalTransactionId,
        openAddModal,
        closeAddModal,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
