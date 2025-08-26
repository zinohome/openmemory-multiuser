"use client";

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setUserId, User } from '@/store/profileSlice';
import { loadUsersFromAPI } from '@/services/userService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, User as UserIcon, Loader2 } from "lucide-react";

export const UserSwitcher: React.FC = () => {
  const dispatch = useDispatch();
  const { userId, currentUser, availableUsers, status } = useSelector((state: RootState) => state.profile);

  // Load users on component mount if not already loaded
  useEffect(() => {
    if (availableUsers.length === 0 && status === 'idle') {
      loadUsersFromAPI(dispatch);
    }
  }, [dispatch, availableUsers.length, status]);

  const handleUserChange = (newUserId: string) => {
    dispatch(setUserId(newUserId));
    // Clear any cached memories when switching users
    // window.location.reload(); // Simple approach - could be optimized later
  };

  const getInitials = (displayName: string) => {
    return displayName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (userId: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500'
    ];
    const index = userId.length % colors.length;
    return colors[index];
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">User:</span>
        </div>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // CLEAN: Don't render anything if no users available
  // This removes the confusing "No users - Please login" message
  if (availableUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">User:</span>
      </div>
      
      <Select value={userId} onValueChange={handleUserChange}>
        <SelectTrigger className="w-[180px] bg-background border-input">
          <SelectValue>
            <div className="flex items-center space-x-2">
              <Avatar className={`h-6 w-6 ${currentUser ? getAvatarColor(currentUser.id) : 'bg-gray-500'}`}>
                <AvatarFallback className="text-xs text-white">
                  {currentUser ? getInitials(currentUser.displayName) : '??'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">
                {currentUser?.displayName || 'Select User'}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableUsers.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center space-x-2">
                <Avatar className={`h-6 w-6 ${getAvatarColor(user.id)}`}>
                  <AvatarFallback className="text-xs text-white">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground">{user.name}</span>
                </div>
                {user.isActive && (
                  <Badge variant="secondary" className="ml-auto">
                    <span className="text-xs">Active</span>
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {availableUsers.length > 0 && (
        <Badge variant="outline">
          {availableUsers.length} user{availableUsers.length !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
};
