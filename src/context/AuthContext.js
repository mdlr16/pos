import React, { createContext, useState, useEffect, useMemo, useRef } from 'react';
import config from '../config';  // Importamos la configuración

export const AuthContext = createContext();

const API_URL = config.API_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [userId, setUserId] = useState(null);
  const [pwd, setPwd] = useState(null);
  const [variables, setVariables] = useState({});
  const [dolibarrToken, setDolibarrToken] = useState(null); // Nuevo estado para el token
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Ref para evitar múltiples inicializaciones
  const isInitializing = useRef(false);

  useEffect(() => {
    // Solo ejecutar una vez y evitar doble inicialización en StrictMode
    if (!isInitialized && !isInitializing.current) {
      isInitializing.current = true;
      initializeAuth();
    }
  }, [isInitialized]);

  const initializeAuth = async () => {
    try {
      console.log('Initializing AuthContext with API URL:', API_URL);
      
      // Cargar datos del localStorage
      const storedUser = localStorage.getItem('user');
      const storedUserId = localStorage.getItem('userId');
      const storedCompany = localStorage.getItem('company');
      const storedPwd = localStorage.getItem('pwd');
      const storedVariables = localStorage.getItem('variables');
      const storedDolibarrToken = localStorage.getItem('dolibarrToken'); // Cargar token guardado

      if (storedUser && storedUserId && storedCompany && storedPwd) {
        console.log('Loading stored credentials for user:', storedUser);
        
        setUser(storedUser);
        setUserId(storedUserId);
        setCompany(storedCompany);
        setPwd(storedPwd);
        setVariables(storedVariables ? JSON.parse(storedVariables) : {});
        setDolibarrToken(storedDolibarrToken); // Cargar token guardado
      } else {
        console.log('No stored credentials found');
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing auth:', error);
      setIsInitialized(true); // Marcar como inicializado aunque haya error
    } finally {
      isInitializing.current = false;
    }
  };

  // Nueva función para obtener el token de Dolibarr
  const fetchDolibarrToken = async (username, password, sposUrl) => {
    try {
      console.log('Fetching Dolibarr token for user:', username);
      
      // Usar la URL de SPOS_URL que se pasa como parámetro
      if (!sposUrl) {
        console.error('SPOS_URL not available for Dolibarr token request');
        return null;
      }
      
      // Construir URL para obtener el token de Dolibarr
      const url = new URL(`${sposUrl}/api/index.php/login`);
      url.searchParams.append('login', username);
      url.searchParams.append('password', password);

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Primero intentar parsear como JSON
      const responseText = await response.text();
      console.log('Dolibarr response:', responseText);
      
      try {
        // Intentar parsear como JSON primero
        const jsonData = JSON.parse(responseText);
        
        if (jsonData.success && jsonData.success.token) {
          const token = jsonData.success.token;
          console.log('Dolibarr token obtained successfully (JSON)');
          
          // Guardar el token
          setDolibarrToken(token);
          localStorage.setItem('dolibarrToken', token);
          
          return token;
        } else if (jsonData.error) {
          throw new Error(`Dolibarr login failed: ${jsonData.error.message || 'Unknown error'}`);
        }
      } catch (jsonError) {
        // Si falla JSON, intentar parsear como XML
        console.log('JSON parsing failed, trying XML...');
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(responseText, 'text/xml');
        
        // Buscar el token en la respuesta XML
        const tokenElement = xmlDoc.getElementsByTagName('token')[0];
        const successElement = xmlDoc.getElementsByTagName('success')[0];
        
        if (successElement && tokenElement) {
          const token = tokenElement.textContent;
          console.log('Dolibarr token obtained successfully (XML)');
          
          // Guardar el token
          setDolibarrToken(token);
          localStorage.setItem('dolibarrToken', token);
          
          return token;
        } else {
          // Verificar si hay error en la respuesta XML
          const errorElement = xmlDoc.getElementsByTagName('error')[0];
          if (errorElement) {
            const messageElement = errorElement.getElementsByTagName('message')[0];
            const errorMessage = messageElement ? messageElement.textContent : 'Unknown error';
            throw new Error(`Dolibarr login failed: ${errorMessage}`);
          } else {
            throw new Error('Invalid response format from Dolibarr API');
          }
        }
      }
      
      throw new Error('No token found in response');
    } catch (error) {
      console.error('Error fetching Dolibarr token:', error);
      // No lanzar el error para no interrumpir el login principal
      return null;
    }
  };

  const login = async (username, password) => {
    try {
      console.log('Attempting login for user:', username);
      
      // Construir URL de manera segura
      const url = new URL(`${API_URL}/login.php`);
      url.searchParams.append('login', username);
      url.searchParams.append('password', password);

      const response = await fetch(url.toString(), {    
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        console.log('Login successful for user:', data.user.login);
        
        // Actualizar estado
        setUser(data.user.login);
        setUserId(data.user.rowid);
        setCompany(data.user.entity);
        setPwd(password);
       
        // Guardar en localStorage
        localStorage.setItem('user', data.user.login);
        localStorage.setItem('userId', data.user.rowid);
        localStorage.setItem('company', data.user.entity);
        localStorage.setItem('pwd', password);
        
        // Cargar variables después del login exitoso
        await fetchVariables(username, password);
        
        // Obtener token de Dolibarr después de cargar las variables
        // (necesitamos SPOS_URL que está en las variables)
        const currentVariables = JSON.parse(localStorage.getItem('variables') || '{}');
        if (currentVariables.SPOS_URL) {
          await fetchDolibarrToken(username, password, currentVariables.SPOS_URL);
        } else {
          console.warn('SPOS_URL not found in variables, skipping Dolibarr token fetch');
        }
       
        return { status: 'success' };
      } else {
        console.error('Login failed:', data.message);
        return { status: 'error', message: data.message || 'Invalid credentials' };
      }
    } catch (error) {
      console.error('Error during login:', error);
      return { status: 'error', message: 'Error connecting to the server' };
    }
  };

  const fetchVariables = async (username, password) => {
    try {
      console.log('Fetching variables for user:', username);
      
      // Construir URL de manera segura
      const url = new URL(`${API_URL}/conf.php`);
      url.searchParams.append('login', username);
      url.searchParams.append('password', password);

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success') {
        console.log('Variables loaded successfully');
        
        const vars = {};
        data.variables.forEach((variable) => {
          vars[variable.name] = variable.value;
          console.log(variable);
        });
        
        setVariables(vars);
        localStorage.setItem('variables', JSON.stringify(vars));
      } else {
        console.error("Error fetching variables:", data.message);
      }
    } catch (error) {
      console.error('Error fetching variables:', error);
    }
  };

  // Función para renovar el token de Dolibarr manualmente
  const refreshDolibarrToken = async () => {
    if (user && pwd && variables.SPOS_URL) {
      return await fetchDolibarrToken(user, pwd, variables.SPOS_URL);
    } else {
      console.warn('Cannot refresh Dolibarr token: missing user, password, or SPOS_URL');
      return null;
    }
  };

  const logout = () => {
    console.log('Logging out user:', user);
    
    setUser(null);
    setUserId(null);
    setCompany(null);
    setPwd(null);
    setVariables({});
    setDolibarrToken(null); // Limpiar token de Dolibarr
    
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('company');
    localStorage.removeItem('pwd');
    localStorage.removeItem('variables');
    localStorage.removeItem('dolibarrToken'); // Limpiar token guardado
  };

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    pwd,
    user,
    company,
    userId,
    variables: {
      ...variables,
      DOLIBARR_API_KEY: dolibarrToken // Agregar el token a las variables
    },
    dolibarrToken, // Exponer el token directamente también
    isInitialized,
    login,
    logout,
    refreshDolibarrToken, // Función para renovar token
    API_URL  // Incluir API_URL para que el Dashboard pueda acceder
  }), [pwd, user, company, userId, variables, dolibarrToken, isInitialized]);

  // Debug info - solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('AuthContext render:', {
      user: !!user,
      isInitialized,
      variablesLoaded: Object.keys(variables).length > 0,
      dolibarrTokenLoaded: !!dolibarrToken
    });
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};