import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export const FavoriteButton = ({ 
  itemId, 
  itemType, 
  onToggle,
  size = "default" 
}) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    setIsFavorite(!!favorites[itemType]?.includes(itemId));
  }, [itemId, itemType]);

  const handleToggle = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
    
    if (!favorites[itemType]) {
      favorites[itemType] = [];
    }

    const index = favorites[itemType].indexOf(itemId);
    if (index > -1) {
      favorites[itemType].splice(index, 1);
      setIsFavorite(false);
    } else {
      favorites[itemType].push(itemId);
      setIsFavorite(true);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    if (onToggle) {
      onToggle(isFavorite);
    }
  };

  const iconSize = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return (
    <Tooltip content={isFavorite ? "Remove from favorites" : "Add to favorites"}>
      <Button
        variant="ghost"
        size={size === "sm" ? "icon" : "default"}
        onClick={handleToggle}
        className={isFavorite ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-gray-600"}
      >
        <Star className={`${iconSize} ${isFavorite ? 'fill-current' : ''}`} />
      </Button>
    </Tooltip>
  );
};

export const useFavorites = (itemType) => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const loadFavorites = () => {
      const allFavorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      setFavorites(allFavorites[itemType] || []);
    };

    loadFavorites();

    // Listen for storage changes
    window.addEventListener('storage', loadFavorites);
    return () => window.removeEventListener('storage', loadFavorites);
  }, [itemType]);

  const isFavorite = (itemId) => favorites.includes(itemId);

  return { favorites, isFavorite };
};