"use client";

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { setUserId, User } from '@/store/profileSlice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, User as UserIcon } from "lucide-react";

export const UserSwitcher: React.FC = () => {
  const dispatch = useDispatch();
  const { userId, currentUser, availableUsers } = useSelector((state: RootState) => state.profile);

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
              <Avatar className={`h-6 w-6 ${getAvatarColor(userId)}`}>
                <AvatarFallback className="text-xs text-white">
                  {currentUser ? getInitials(currentUser.displayName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {currentUser?.displayName || 'Select User'}
              </span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableUsers.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              <div className="flex items-center space-x-2 w-full">
                <Avatar className={`h-6 w-6 ${getAvatarColor(user.id)}`}>
                  <AvatarFallback className="text-xs text-white">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">{user.displayName}</span>
                  <span className="text-xs text-muted-foreground">{user.name}</span>
                </div>
                {user.isActive && (
                  <Badge variant="secondary" className="ml-auto">
                    Active
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
