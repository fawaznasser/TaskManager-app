import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TaskFiltersProps {
  onSearch: (text: string) => void;
  onSort: (key: 'deadline' | 'priority' | 'category') => void;
  onFilter: (status: 'all' | 'pending' | 'in_progress' | 'completed') => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  onSearch,
  onSort,
  onFilter,
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [activeSortKey, setActiveSortKey] = useState<'deadline' | 'priority' | 'category'>('deadline');

  const handleSearch = (text: string) => {
    setSearchText(text);
    onSearch(text);
  };

  const handleFilter = (filter: 'all' | 'pending' | 'in_progress' | 'completed') => {
    setActiveFilter(filter);
    onFilter(filter);
  };

  const handleSort = (key: 'deadline' | 'priority' | 'category') => {
    setActiveSortKey(key);
    onSort(key);
  };

  const SORT_OPTIONS = [
    { key: 'deadline', icon: 'access-time', label: 'Deadline' },
    { key: 'priority', icon: 'low-priority', label: 'Priority' },
    { key: 'category', icon: 'category', label: 'Category' }
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.label}>Status:</Text>
        <View style={styles.filterButtons}>
          {['all', 'pending', 'in_progress', 'completed'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => handleFilter(filter as 'all' | 'pending' | 'in_progress' | 'completed')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === filter && styles.activeFilterButtonText,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.label}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {SORT_OPTIONS.map(({ key, icon, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sortButton,
                activeSortKey === key && styles.activeSortButton,
              ]}
              onPress={() => handleSort(key as 'deadline' | 'priority' | 'category')}
            >
              <MaterialIcons
                name={icon}
                size={20}
                color={activeSortKey === key ? 'white' : '#666'}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  activeSortKey === key && styles.activeSortButtonText,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterContainer: {
    marginBottom: 15,
  },
  sortContainer: {
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  activeSortButton: {
    backgroundColor: '#007AFF',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeSortButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default TaskFilters; 