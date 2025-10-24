import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { URL_BACKEND, URL_SERVICE } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket | null = null;
  // Normalizar URL del servicio de chat para evitar doble slash
  private apiUrl: string;
  
  // Estado del chat
  private conversationId: number | null = null;
  private sessionId: string | null = null;
  
  // Observables para la UI
  private messagesSubject = new BehaviorSubject<any[]>([]);
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private isChatOpenSubject = new BehaviorSubject<boolean>(false);
  private typingStatusSubject = new BehaviorSubject<{isTyping: boolean, name: string}>({isTyping: false, name: ''});
  private unreadCountSubject = new BehaviorSubject<number>(0);
  
  // Stream de mensajes para componentes
  public messages$ = this.messagesSubject.asObservable();
  public isConnected$ = this.isConnectedSubject.asObservable();
  public isChatOpen$ = this.isChatOpenSubject.asObservable();
  public typingStatus$ = this.typingStatusSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Construir apiUrl limpio: usar URL_SERVICE si existe, sino URL_BACKEND + /api
    const svc = (typeof URL_SERVICE !== 'undefined' && URL_SERVICE) ? URL_SERVICE : `${URL_BACKEND}/api`;
    const cleaned = svc.replace(/\/+$|\/+$/g, '').replace(/\/+$/, '');
    // cleaned ahora puede ser 'http://host:port/api' ó 'http://host:port'
    this.apiUrl = `${cleaned}/chat`;

    // Intentar recuperar sessionId del almacenamiento local
    this.sessionId = localStorage.getItem('chat_session_id');
    
    // Inicializar contador de no leídos
    const unreadCount = localStorage.getItem('chat_unread_count');
    if (unreadCount) {
      this.unreadCountSubject.next(parseInt(unreadCount, 10));
    }
  }

  /**
   * Inicializa la conexión Socket.IO
   */
  private initSocketConnection(): void {
    if (this.socket && this.socket.connected) {
      return; // Ya está conectado
    }
    
    //this.socket = io(URL_SERVICE, { //this.socket = io(environment.URL_BACKEND, {
    this.socket = io(URL_BACKEND, { //this.socket = io(environment.URL_BACKEND, {
      transports: ['websocket'],
      upgrade: false
    });
    
    // Eventos de conexión
    this.socket.on('connect', () => {
      console.log('Conectado al servidor de chat');
      this.isConnectedSubject.next(true);
      
      // Si tenemos un sessionId guardado, identificamos al usuario
      if (this.sessionId) {
        this.identifyUser();
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log('Desconectado del servidor de chat');
      this.isConnectedSubject.next(false);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión:', error);
      this.isConnectedSubject.next(false);
    });
    
    // Eventos específicos del chat
    this.setupChatEvents();
  }
  
  /**
   * Configura los eventos del socket para el chat
   */
  private setupChatEvents(): void {
    // Cuando la conversación está lista
    this.socket?.on('conversation-ready', (data) => {
      console.log('Conversación lista:', data);
      this.conversationId = data.conversation_id;
      
      // Solicitar historial de mensajes
      this.requestChatHistory();
    });
    
    // Cuando se recibe un nuevo mensaje
    this.socket?.on('new-message', (message) => {
      console.log('Nuevo mensaje recibido:', message);
      
      // Añadir el mensaje al array de mensajes
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, message]);
      
      // Si el mensaje es de un agente y el chat no está abierto, incrementar contador
      if (message.sender_type === 'agent' && !this.isChatOpenSubject.value) {
        const currentCount = this.unreadCountSubject.value;
        this.unreadCountSubject.next(currentCount + 1);
        localStorage.setItem('chat_unread_count', (currentCount + 1).toString());
      }
      
      // Si el chat está abierto y es un mensaje de agente, marcarlo como leído
      if (this.isChatOpenSubject.value && message.sender_type === 'agent') {
        this.markMessagesAsRead();
      }
    });
    
    // Cuando un agente se une a la conversación
    this.socket?.on('agent-joined', (data) => {
      console.log('Agente se unió:', data);
      // Podríamos mostrar un mensaje en el chat
    });
    
    // Cuando la conversación es cerrada
    this.socket?.on('conversation-closed', (data) => {
      console.log('Conversación cerrada:', data);
      // Podríamos mostrar un mensaje y cerrar el chat
    });
    
    // Cuando alguien está escribiendo
    this.socket?.on('typing-update', (data) => {
      if (data.is_agent && data.is_typing) {
        this.typingStatusSubject.next({
          isTyping: true, 
          name: data.user_name || 'Agente'
        });
      } else {
        this.typingStatusSubject.next({
          isTyping: false,
          name: ''
        });
      }
    });
    
    // Cuando se recibe el historial de chat
    this.socket?.on('chat-history', (data) => {
      console.log('Historial de chat recibido:', data);
      if (data.conversation_id === this.conversationId) {
        this.messagesSubject.next(data.messages || []);
      }
    });
    
    // Manejo de errores
    this.socket?.on('error', (error) => {
      console.error('Error en el chat:', error);
    });
  }
  
  /**
   * Identifica al usuario en el servidor socket
   */
  private identifyUser(): void {
    // Obtener el usuario actual
  const currentUser = this.authService.userSubject.value;
  const currentGuestUser = this.authService.userGuestSubject.value;
    // fallback: si no existe guest en authService, revisar localStorage
    let guestId = currentGuestUser?._id || localStorage.getItem('chat_guest_id') || null;
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
      localStorage.setItem('chat_guest_id', guestId);
    }

    const userData = {
      session_id: this.sessionId,
      user_id: currentUser?._id,
      guest_id: guestId
    };
    
    console.log('Identificando usuario:', userData);
    this.socket?.emit('identify-user', userData);
  }
  
  /**
   * Inicia una nueva sesión de chat
   */
  public initChat(): Observable<any> {
    // Si ya tenemos una sesión, no creamos una nueva
    if (this.sessionId) {
      return new Observable(observer => {
        observer.next({ session_id: this.sessionId });
        observer.complete();
      });
    }
    
    // Obtener el usuario actual
  const currentUser = this.authService.userSubject.value;
  const currentGuestUser = this.authService.userGuestSubject.value;

    // Asegurar que tenemos un guest_id persistente para usuarios invitados
    let guestId = currentGuestUser?._id || localStorage.getItem('chat_guest_id') || null;
    if (!guestId && !currentUser) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
      localStorage.setItem('chat_guest_id', guestId);
    }

    const userData: any = {
      user_id: currentUser?._id
    };
    if (guestId) userData.guest_id = guestId;
    
    return new Observable(observer => {
      this.http.post(`${this.apiUrl}/init`, userData).subscribe({
        next: (response: any) => {
          if (response.success && response.conversation) {
            // Guardar el ID de sesión
            this.sessionId = response.conversation.session_id;
            if (this.sessionId) {
              localStorage.setItem('chat_session_id', this.sessionId);
            }
            
            // Inicializar la conexión de socket si no existe
            this.initSocketConnection();
            
            // Identificar al usuario en el socket
            this.identifyUser();
            
            observer.next(response);
            observer.complete();
          } else {
            observer.error(new Error('No se pudo iniciar el chat'));
          }
        },
        error: (err) => {
          console.error('Error al iniciar chat:', err);
          observer.error(err);
        }
      });
    });
  }
  
  /**
   * Abre el chat
   */
  public openChat(): void {
    // Inicializar chat si es necesario
    if (!this.sessionId) {
      this.initChat().subscribe();
    } else if (!this.socket || !this.socket.connected) {
      // Si tenemos sessionId pero no socket, conectar
      this.initSocketConnection();
    }
    
    // Marcar el chat como abierto
    this.isChatOpenSubject.next(true);
    
    // Resetear contador de no leídos
    this.unreadCountSubject.next(0);
    localStorage.setItem('chat_unread_count', '0');
    
    // Marcar mensajes como leídos
    if (this.conversationId) {
      this.markMessagesAsRead();
    }
  }
  
  /**
   * Cierra el chat
   */
  public closeChat(): void {
    this.isChatOpenSubject.next(false);
  }
  
  /**
   * Solicita el historial de mensajes de la conversación actual
   */
  public requestChatHistory(): void {
    if (!this.conversationId || !this.socket) return;
    
    this.socket?.emit('get-history', {
      conversation_id: this.conversationId
    });
  }
  
  /**
   * Envía un mensaje al chat
   * @param message Texto del mensaje
   */
  public sendMessage(message: string): void {
    if (!this.conversationId || !this.sessionId || !this.socket) {
      console.error('No se puede enviar el mensaje: falta información de la sesión');
      return;
    }
    
    // Obtener el usuario actual
  const currentUser = this.authService.userSubject.value;
  const currentGuestUser = this.authService.userGuestSubject.value;
    
    // Enviar el mensaje a través del socket
    this.socket?.emit('user-message', {
      conversation_id: this.conversationId,
      session_id: this.sessionId,
      user_id: currentUser?._id,
      guest_id: currentGuestUser?._id,
      message
    });
  }
  
  /**
   * Notifica que el usuario está escribiendo
   */
  public sendTypingStatus(isTyping: boolean): void {
    if (!this.conversationId || !this.sessionId || !this.socket) return;
    
  // Obtener el nombre del usuario
  const currentUser = this.authService.userSubject.value;
  const userName = currentUser?.firstname || 'Usuario';
    
    if (isTyping) {
      this.socket?.emit('typing', {
        conversation_id: this.conversationId,
        session_id: this.sessionId,
        is_agent: false,
        user_name: userName
      });
    } else {
      this.socket?.emit('stopped-typing', {
        conversation_id: this.conversationId,
        session_id: this.sessionId,
        is_agent: false
      });
    }
  }
  
  /**
   * Marca los mensajes de la conversación como leídos
   */
  public markMessagesAsRead(): void {
    if (!this.conversationId || !this.sessionId || !this.socket) return;
    
    this.socket?.emit('mark-read', {
      conversation_id: this.conversationId,
      session_id: this.sessionId,
      reader_type: 'user'
    });
  }
  
  /**
   * Solicita soporte (inicia una conversación con información adicional)
   */
  public requestSupport(data: {name?: string, email?: string, issue?: string}): void {
    // Obtener el usuario actual
  const currentUser = this.authService.userSubject.value;
  const currentGuestUser = this.authService.userGuestSubject.value;
    
    // Si no hay socket, inicializarlo
    if (!this.socket || !this.socket.connected) {
      this.initSocketConnection();
    }
    
    // Generar un sessionId si no existe
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('chat_session_id', this.sessionId);
    }
    
    // Enviar solicitud de soporte
    this.socket?.emit('request-support', {
      session_id: this.sessionId,
      user_id: currentUser?._id,
      guest_id: currentGuestUser?._id,
      name: data.name || currentUser?.firstname || 'Usuario',
      email: data.email || currentUser?.email || '',
      issue: data.issue
    });
    
    // Abrir el chat
    this.openChat();
  }
  
  /**
   * Desconecta el socket y limpia el estado
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.isConnectedSubject.next(false);
    this.messagesSubject.next([]);
  }
  
  /**
   * Cierra completamente el chat (sesión finalizada)
   */
  public endChat(): void {
    // Eliminar datos de sesión
    localStorage.removeItem('chat_session_id');
    localStorage.removeItem('chat_unread_count');
    
    // Resetear estado
    this.sessionId = null;
    this.conversationId = null;
    this.messagesSubject.next([]);
    this.unreadCountSubject.next(0);
    this.isChatOpenSubject.next(false);
    
    // Desconectar socket
    this.disconnect();
  }
}