import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { 
  User, 
  LoginCredentials, 
  AuthResponse, 
  AuthError, 
  Role, 
  Permission, 
  UserRole,
  CreateRoleData,
  UpdateRoleData,
  AssignRoleData 
} from '@/types/auth';

interface AuthStore {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  roles: Role[];
  permissions: Permission[];
  userRoles: UserRole[];

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => boolean;
  
  // Role Management
  fetchRoles: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  fetchUserRoles: (userId: string) => Promise<void>;
  createRole: (roleData: CreateRoleData) => Promise<void>;
  updateRole: (roleId: string, roleData: UpdateRoleData) => Promise<void>;
  assignRole: (assignData: AssignRoleData) => Promise<void>;
  removeRole: (userId: string, roleId: string) => Promise<void>;
  
  // Permission checking
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

// Helper function to convert Firebase user to our User type
const convertFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
  // Fetch user roles from Firestore
  const userRolesQuery = query(
    collection(db, 'userRoles'),
    where('userId', '==', firebaseUser.uid),
    where('isActive', '==', true)
  );
  
  const userRolesSnapshot = await getDocs(userRolesQuery);
  const userRoles: UserRole[] = userRolesSnapshot.docs.map(doc => ({
    ...doc.data(),
    assignedAt: doc.data().assignedAt?.toDate() || new Date(),
  })) as UserRole[];

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    emailVerified: firebaseUser.emailVerified,
    createdAt: new Date(firebaseUser.metadata.creationTime || ''),
    updatedAt: new Date(firebaseUser.metadata.lastSignInTime || ''),
    roles: userRoles,
    customClaims: {},
  };
};

// Initialize default permissions
const initializeDefaultPermissions = async () => {
  const permissionsRef = collection(db, 'permissions');
  const permissionsSnapshot = await getDocs(permissionsRef);
  
  if (permissionsSnapshot.empty) {
    const defaultPermissions: Omit<Permission, 'id'>[] = [
      // User management permissions
      { name: 'Read Users', resource: 'users', action: 'read', description: 'View user information' },
      { name: 'Write Users', resource: 'users', action: 'write', description: 'Create and update users' },
      { name: 'Delete Users', resource: 'users', action: 'delete', description: 'Delete users' },
      { name: 'Manage Users', resource: 'users', action: 'manage', description: 'Full user management' },
      
      // Role management permissions
      { name: 'Read Roles', resource: 'roles', action: 'read', description: 'View roles and permissions' },
      { name: 'Write Roles', resource: 'roles', action: 'write', description: 'Create and update roles' },
      { name: 'Delete Roles', resource: 'roles', action: 'delete', description: 'Delete roles' },
      
      // Student management permissions
      { name: 'Read Students', resource: 'students', action: 'read', description: 'View student information' },
      { name: 'Write Students', resource: 'students', action: 'write', description: 'Create and update students' },
      { name: 'Delete Students', resource: 'students', action: 'delete', description: 'Delete students' },
      { name: 'Manage Students', resource: 'students', action: 'manage', description: 'Full student management' },
      { name: 'Manage Roles', resource: 'roles', action: 'manage', description: 'Full role management' },

      // Resource management permissions
      { name: 'Read Resources', resource: 'resources', action: 'read', description: 'View resources' },
      { name: 'Write Resources', resource: 'resources', action: 'write', description: 'Create and update resources' },
      { name: 'Delete Resources', resource: 'resources', action: 'delete', description: 'Delete resources' },
      { name: 'Manage Resources', resource: 'resources', action: 'manage', description: 'Full resource management' },
      
      { name: 'Read tutors', resource: 'tutors', action: 'read', description: 'View tutors' },
      { name: 'Write tutors', resource: 'tutors', action: 'write', description: 'Create and update tutors' },
      { name: 'Delete tutors', resource: 'tutors', action: 'delete', description: 'Delete tutors' },
      { name: 'Manage tutors', resource: 'tutors', action: 'manage', description: 'Full tutor management' },

      // Notification management permissions
      { name: 'Read Notifications', resource: 'notifications', action: 'read', description: 'View notifications' },
      { name: 'Write Notifications', resource: 'notifications', action: 'write', description: 'Create and update notifications' },
      { name: 'Delete Notifications', resource: 'notifications', action: 'delete', description: 'Delete notifications' },
      { name: 'Manage Notifications', resource: 'notifications', action: 'manage', description: 'Full notification management' },

      // Support management permissions
      { name: 'Read Support', resource: 'support', action: 'read', description: 'View support conversations' },
      { name: 'Write Support', resource: 'support', action: 'write', description: 'Send support messages' },
      { name: 'Manage Support', resource: 'support', action: 'manage', description: 'Full support management' },

      // Promo code management permissions
      { name: 'Read Promo Codes', resource: 'promo_codes', action: 'read', description: 'View promo codes' },
      { name: 'Write Promo Codes', resource: 'promo_codes', action: 'write', description: 'Create and update promo codes' },
      { name: 'Delete Promo Codes', resource: 'promo_codes', action: 'delete', description: 'Delete promo codes' },
      { name: 'Manage Promo Codes', resource: 'promo_codes', action: 'manage', description: 'Full promo code management' },

      // Reports management permissions
      { name: 'Read Reports', resource: 'reports', action: 'read', description: 'View reports' },
      { name: 'Manage Reports', resource: 'reports', action: 'manage', description: 'Full report management' },

      // Customer support management permissions
      { name: 'Read Customer Support', resource: 'customer-support', action: 'read', description: 'View customer support conversations' },
      { name: 'Write Customer Support', resource: 'customer-support', action: 'write', description: 'Send customer support messages' },
      { name: 'Manage Customer Support', resource: 'customer-support', action: 'manage', description: 'Full customer support management' },

      // Requests management permissions
      { name: 'Read Requests', resource: 'requests', action: 'read', description: 'View requests' },
      { name: 'Manage Requests', resource: 'requests', action: 'manage', description: 'Full request management' },

      // Price access request permissions
      { name: 'Request Tutor Price', resource: 'requests', action: 'request_tutor_price', description: 'Request access to tutor pricing' },
      { name: 'Request Student Price', resource: 'requests', action: 'request_student_price', description: 'Request access to student pricing' },
    ];

    for (const permission of defaultPermissions) {
      await setDoc(doc(permissionsRef), {
        ...permission,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
};

// Initialize default roles
const initializeDefaultRoles = async () => {
  const rolesRef = collection(db, 'roles');
  const rolesSnapshot = await getDocs(rolesRef);
  
  if (rolesSnapshot.empty) {
    // Get all permissions
    const permissionsSnapshot = await getDocs(collection(db, 'permissions'));
    const allPermissions = permissionsSnapshot.docs.map(doc => doc.id);
    
    // Filter permissions by resource for different role levels
    const userPermissions = permissionsSnapshot.docs
      .filter(doc => doc.data().resource === 'users')
      .map(doc => doc.id);
    
    const analyticsPermissions = permissionsSnapshot.docs
      .filter(doc => doc.data().resource === 'analytics')
      .map(doc => doc.id);
    
    const rolePermissions = permissionsSnapshot.docs
      .filter(doc => doc.data().resource === 'roles')
      .map(doc => doc.id);
    
    const readPermissions = permissionsSnapshot.docs
      .filter(doc => doc.data().action === 'read')
      .map(doc => doc.id);
    
    const defaultRoles: Omit<Role, 'id'>[] = [
      {
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        permissions: allPermissions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Admin',
        description: 'Administrative access to most features',
        permissions: [...userPermissions, ...analyticsPermissions, ...readPermissions],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Moderator',
        description: 'Moderate access to content management',
        permissions: [...readPermissions, ...analyticsPermissions],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Viewer',
        description: 'Read-only access to most features',
        permissions: readPermissions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const role of defaultRoles) {
      await setDoc(doc(rolesRef), {
        ...role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
};

export const useFirebaseAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      roles: [],
      permissions: [],
      userRoles: [],

      // Actions
      login: async (credentials) => {
        try {
          set({ loading: true, error: null });
          
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            credentials.email, 
            credentials.password
          );
          
          const user = await convertFirebaseUser(userCredential.user);
          
          set({
            user,
            firebaseUser: userCredential.user,
            isAuthenticated: true,
            loading: false,
          });
          
          // Initialize default data if needed
          await initializeDefaultPermissions();
          await initializeDefaultRoles();
          
        } catch (error: any) {
          console.error('Login error:', error);
          set({
            error: error.message || 'Login failed',
            loading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        // Clear all auth state
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          error: null,
          userRoles: [],
          roles: [],
          permissions: [],
          loading: false,
        });
        
        // Clear localStorage for auth token if it exists
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth-storage');
        }
      },

      clearError: () => set({ error: null }),
      
      setLoading: (loading) => set({ loading }),

      checkAuth: () => {
        const { firebaseUser } = get();
        return !!firebaseUser;
      },

      // Role Management
      fetchRoles: async () => {
        try {
          const rolesSnapshot = await getDocs(collection(db, 'roles'));
          const roles: Role[] = rolesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || '',
              description: data.description || '',
              isActive: data.isActive || false,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              permissions: data.permissions || [], // Permission IDs
            };
          });

          set({ roles });
        } catch (error) {
          console.error('Error fetching roles:', error);
          set({ error: 'Failed to fetch roles' });
        }
      },

      fetchPermissions: async () => {
        try {
          const permissionsSnapshot = await getDocs(collection(db, 'permissions'));
          const permissions: Permission[] = permissionsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Permission[];

          set({ permissions });
        } catch (error) {
          console.error('Error fetching permissions:', error);
          set({ error: 'Failed to fetch permissions' });
        }
      },

      fetchUserRoles: async (userId) => {
        try {
          const userRolesQuery = query(
            collection(db, 'userRoles'),
            where('userId', '==', userId),
            where('isActive', '==', true)
          );
          
          const userRolesSnapshot = await getDocs(userRolesQuery);
          const userRoles: UserRole[] = userRolesSnapshot.docs.map(doc => ({
            ...doc.data(),
            assignedAt: doc.data().assignedAt?.toDate() || new Date(),
          })) as UserRole[];

          set({ userRoles });
        } catch (error) {
          console.error('Error fetching user roles:', error);
          set({ error: 'Failed to fetch user roles' });
        }
      },

      createRole: async (roleData) => {
        try {
          set({ loading: true, error: null });
          
          const roleRef = doc(collection(db, 'roles'));
          await setDoc(roleRef, {
            ...roleData,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          set({ loading: false });
          get().fetchRoles();
        } catch (error) {
          console.error('Error creating role:', error);
          set({ 
            error: 'Failed to create role',
            loading: false 
          });
          throw error;
        }
      },

      updateRole: async (roleId, roleData) => {
        try {
          set({ loading: true, error: null });
          
          const roleRef = doc(db, 'roles', roleId);
          await updateDoc(roleRef, {
            ...roleData,
            updatedAt: serverTimestamp(),
          });

          set({ loading: false });
          get().fetchRoles();
        } catch (error) {
          console.error('Error updating role:', error);
          set({ 
            error: 'Failed to update role',
            loading: false 
          });
          throw error;
        }
      },

      assignRole: async (assignData) => {
        try {
          set({ loading: true, error: null });
          
          const userRoleRef = doc(collection(db, 'userRoles'));
          await setDoc(userRoleRef, {
            ...assignData,
            isActive: true,
            assignedAt: serverTimestamp(),
          });

          set({ loading: false });
          get().fetchUserRoles(assignData.userId);
        } catch (error) {
          console.error('Error assigning role:', error);
          set({ 
            error: 'Failed to assign role',
            loading: false 
          });
          throw error;
        }
      },

      removeRole: async (userId, roleId) => {
        try {
          set({ loading: true, error: null });
          
          const userRolesQuery = query(
            collection(db, 'userRoles'),
            where('userId', '==', userId),
            where('roleId', '==', roleId),
            where('isActive', '==', true)
          );
          
          const userRolesSnapshot = await getDocs(userRolesQuery);
          
          for (const docSnapshot of userRolesSnapshot.docs) {
            await updateDoc(docSnapshot.ref, {
              isActive: false,
              updatedAt: serverTimestamp(),
            });
          }

          set({ loading: false });
          get().fetchUserRoles(userId);
        } catch (error) {
          console.error('Error removing role:', error);
          set({ 
            error: 'Failed to remove role',
            loading: false 
          });
          throw error;
        }
      },

      // Permission checking
      hasPermission: (resource, action) => {
        const { user, roles, permissions } = get();
        if (!user) return false;
        // Check if user has any role with the required permission
        return user.roles.some(userRole => {
          const role = roles.find(r => r.id === userRole.roleId);
          return role?.permissions.some(permissionId => {
            const permission = permissions.find(p => p.id === permissionId);
            return permission?.resource === resource && permission?.action === action;
          });
        });
      },

      hasRole: (roleName) => {
        const { user, roles } = get();
        if (!user) return false;

        return user.roles.some(userRole => {
          const role = roles.find(r => r.id === userRole.roleId);
          return role?.name === roleName;
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        firebaseUser: state.firebaseUser,
        isAuthenticated: state.isAuthenticated,
        roles: state.roles,
        permissions: state.permissions,
      }),
    }
  )
);

// Initialize auth state listener
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (firebaseUser) => {
    const store = useFirebaseAuthStore.getState();
    
    if (firebaseUser) {
      try {
        const user = await convertFirebaseUser(firebaseUser);
        store.setLoading(false);
        
        useFirebaseAuthStore.setState({
          user,
          firebaseUser,
          isAuthenticated: true,
        });
        
        // Fetch roles and permissions
        await store.fetchRoles();
        await store.fetchPermissions();
        await store.fetchUserRoles(firebaseUser.uid);
      } catch (error) {
        console.error('Error converting Firebase user:', error);
        store.logout();
      }
    } else {
      useFirebaseAuthStore.setState({
        user: null,
        firebaseUser: null,
        isAuthenticated: false,
        userRoles: [],
        roles: [],
        permissions: [],
        loading: false,
        error: null,
      });
    }
  });
}
