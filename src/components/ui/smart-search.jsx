import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, X, Clock, TrendingUp, Sparkles } from "lucide-react";

export function SmartSearch({ 
  data = [],
  searchFields = ['name'],
  onResultSelect,
  placeholder = "Search...",
  suggestions = [],
  recentSearches = [],
  onRecentSearchesChange,
  renderResult,
  className = ""
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Filter data based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredData([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = data.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field);
        return value && String(value).toLowerCase().includes(lowerQuery);
      });
    });

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = searchFields.some(field => {
        const value = getNestedValue(a, field);
        return value && String(value).toLowerCase() === lowerQuery;
      });
      const bExact = searchFields.some(field => {
        const value = getNestedValue(b, field);
        return value && String(value).toLowerCase() === lowerQuery;
      });
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    setFilteredData(results.slice(0, 10)); // Limit to 10 results
    setHighlightedIndex(0);
  }, [query, data, searchFields]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || filteredData.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredData.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredData.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredData[highlightedIndex]) {
            handleSelect(filteredData[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredData, highlightedIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (resultsRef.current) {
      const highlightedElement = resultsRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  const handleSelect = (item) => {
    if (onRecentSearchesChange && recentSearches) {
      const newRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      onRecentSearchesChange(newRecent);
    }
    
    onResultSelect?.(item);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleRecentSearch = (search) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  const clearQuery = () => {
    setQuery("");
    setFilteredData([]);
    inputRef.current?.focus();
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, idx) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={idx} className="bg-yellow-200">{part}</mark>
        : part
    );
  };

  const showDropdown = isOpen && (filteredData.length > 0 || suggestions.length > 0 || recentSearches.length > 0);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={clearQuery}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {showDropdown && (
        <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-hidden shadow-2xl">
          <div ref={resultsRef} className="overflow-y-auto max-h-96">
            {/* Search Results */}
            {filteredData.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Results ({filteredData.length})
                  </p>
                </div>
                {filteredData.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b ${
                      idx === highlightedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    {renderResult ? (
                      renderResult(item, query, highlightMatch)
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900">
                          {highlightMatch(getNestedValue(item, searchFields[0]), query)}
                        </div>
                        {searchFields.length > 1 && (
                          <div className="text-sm text-gray-500">
                            {highlightMatch(getNestedValue(item, searchFields[1]), query)}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* AI Suggestions */}
            {query && filteredData.length === 0 && suggestions.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border-b">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Did you mean?
                  </p>
                </div>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-purple-50 transition-colors border-b"
                  >
                    <div className="text-sm text-gray-700">{suggestion}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recent Searches
                  </p>
                </div>
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentSearch(search)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b flex items-center justify-between group"
                  >
                    <span className="text-sm text-gray-700">{search}</span>
                    <TrendingUp className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {query && filteredData.length === 0 && suggestions.length === 0 && (
              <div className="p-6 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">No results found</p>
                <p className="text-sm text-gray-500">Try different keywords</p>
              </div>
            )}
          </div>

          {/* Keyboard Hints */}
          {filteredData.length > 0 && (
            <div className="px-3 py-2 bg-gray-50 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white border rounded">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> Select
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> Close
                </span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}