'use client';

import React from 'react';
import { PeopleView } from '@/components/people/PeopleView';

interface PageProps {
  onOpenAddModal?: (type?: 'borrow' | 'lending') => void;
}

export default function PeoplePage({ onOpenAddModal = () => {} }: PageProps) {
  return <PeopleView onOpenAddModal={onOpenAddModal} />;
}
