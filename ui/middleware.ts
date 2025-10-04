// ui/middleware.ts
// TEMPORARILY DISABLED FOR DEBUGGING

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
   // 首先处理OPTIONS请求，直接返回成功并添加CORS头
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }
  // 记录中间件执行，用于调试
  //console.log('('Middleware running for path:', request.nextUrl.pathname);
  // 受保护的路由
  const protectedPaths = ['/memories', '/settings', '/apps'];
  
  const path = request.nextUrl.pathname;

  // 特别排除login页面，防止重定向循环
  if (path === '/login') {
    //console.log('('Login page accessed, allowing access');
    return NextResponse.next();
  }

  // 检查是否是受保护路径
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p));
  
  if (isProtectedPath) {
    // 检查cookie认证
    const hasAuthCookie = request.cookies.get('om_auth');
    //console.log('('Protected path check - hasAuthCookie:', !!hasAuthCookie);
    
    // 对于服务端渲染的页面，我们只能检查cookie
    // 对于客户端路由，浏览器会在后续请求中自动带上认证信息
    if (!hasAuthCookie) {
      // 重定向到登录页，并保留原始目标路径
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', path);
      //console.log('('No auth cookie, redirecting to login with redirect:', path);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // 根路径重定向逻辑
  if (path === '/') {
    const hasAuthCookie = request.cookies.get('om_auth');
    //console.log('('Root path check - hasAuthCookie:', !!hasAuthCookie);
    
    if (hasAuthCookie) {
      //console.log('('Root path with auth, redirecting to memories');
      return NextResponse.redirect(new URL('/memories', request.url));
    } else {
      //console.log('('Root path without auth, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  //console.log('('Path allowed:', path);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

/* ORIGINAL CODE - RESTORE AFTER FIXING
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protected routes that require authentication
  const protectedPaths = ['/memories', '/settings', '/apps'];
  
  const path = request.nextUrl.pathname;
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p));
  
  if (isProtectedPath) {
    // Check for API key in cookie (set by login page)
    // Note: In production, you'd want to validate this server-side
    const hasAuth = request.cookies.get('om_auth');
    
    if (!hasAuth) {
      // Redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Redirect root to memories if authenticated, login if not
  if (path === '/') {
    const hasAuth = request.cookies.get('om_auth');
    if (hasAuth) {
      return NextResponse.redirect(new URL('/memories', request.url));
    } else {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};*/
