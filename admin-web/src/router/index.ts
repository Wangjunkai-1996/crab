import type { Pinia } from 'pinia'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { ADMIN_PAGE_ACCESS_KEYS } from '@/constants/admin-contract'
import { ALL_ADMIN_ROLES } from '@/constants/roles'
import { ROUTE_NAMES } from '@/constants/routes'
import { setupRouterGuards } from '@/router/guards'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: ROUTE_NAMES.LOGIN,
        component: () => import('@/pages/auth/login/index.vue'),
        meta: {
          requiresAuth: false,
          pageKey: 'login',
          keepQueryState: false,
        },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: ROUTE_NAMES.DASHBOARD,
        component: () => import('@/pages/dashboard/index/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ALL_ADMIN_ROLES,
          pageKey: ADMIN_PAGE_ACCESS_KEYS.DASHBOARD,
          keepQueryState: false,
        },
      },
      {
        path: 'review/list',
        name: ROUTE_NAMES.REVIEW_LIST,
        component: () => import('@/pages/review/list/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ALL_ADMIN_ROLES,
          pageKey: ADMIN_PAGE_ACCESS_KEYS.REVIEW_LIST,
          keepQueryState: true,
        },
      },
      {
        path: 'review/:reviewTaskId',
        name: ROUTE_NAMES.REVIEW_DETAIL,
        component: () => import('@/pages/review/detail/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ALL_ADMIN_ROLES,
          pageKey: ADMIN_PAGE_ACCESS_KEYS.REVIEW_DETAIL,
          keepQueryState: true,
        },
      },
      {
        path: 'report/list',
        name: ROUTE_NAMES.REPORT_LIST,
        component: () => import('@/pages/report/list/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ALL_ADMIN_ROLES,
          pageKey: ADMIN_PAGE_ACCESS_KEYS.REPORT_LIST,
          keepQueryState: true,
        },
      },
      {
        path: 'report/:reportId',
        name: ROUTE_NAMES.REPORT_DETAIL,
        component: () => import('@/pages/report/detail/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ALL_ADMIN_ROLES,
          pageKey: ADMIN_PAGE_ACCESS_KEYS.REPORT_DETAIL,
          keepQueryState: true,
        },
      },
      {
        path: 'blacklist',
        name: ROUTE_NAMES.BLACKLIST,
        component: () => import('@/pages/blacklist/list/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ['ops_admin', 'super_admin'],
          pageKey: ADMIN_PAGE_ACCESS_KEYS.ACCOUNT_ACTION_LIST,
          keepQueryState: true,
        },
      },
      {
        path: 'logs',
        name: ROUTE_NAMES.LOGS,
        component: () => import('@/pages/logs/index/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ['ops_admin', 'super_admin'],
          pageKey: ADMIN_PAGE_ACCESS_KEYS.OPERATION_LOG_LIST,
          keepQueryState: true,
        },
      },
      {
        path: '403',
        name: ROUTE_NAMES.FORBIDDEN,
        component: () => import('@/pages/forbidden/index/index.vue'),
        meta: {
          requiresAuth: true,
          allowedRoles: ALL_ADMIN_ROLES,
          pageKey: 'forbidden',
          keepQueryState: false,
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

export const createAppRouter = (pinia: Pinia) => {
  const router = createRouter({
    history: createWebHistory(),
    routes,
  })

  setupRouterGuards(router, pinia)
  return router
}
