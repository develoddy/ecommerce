import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { AuthService } from 'src/app/modules/auth-profile/_services/auth.service';
import { PrelaunchConfigService } from 'src/app/services/prelaunch-config.service';

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: any[] = [];
  isConnected = false;
  isChatOpen = false;
  messageControl = new FormControl('', [Validators.required]);
  typingStatus: { isTyping: boolean, name: string } = { isTyping: false, name: '' };
  unreadCount = 0;
  // Local flag to control showing the close-confirm popup
  showCloseConfirm = false;
  // Control visibility based on prelaunch status
  isChatEnabled = true;
  
  // Para gestionar el estado de "está escribiendo"
  private typingSubject = new Subject<string>();
  private subscriptions = new Subscription();
  
  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private prelaunchConfigService: PrelaunchConfigService
  ) {}

  ngOnInit(): void {
    // Suscribirse a los mensajes del chat
    this.subscriptions.add(
      this.chatService.messages$.subscribe(messages => {
        this.messages = messages;
        this.scrollToBottom();
      })
    );
    
    // Suscribirse al estado de conexión
    this.subscriptions.add(
      this.chatService.isConnected$.subscribe(isConnected => {
        this.isConnected = isConnected;
      })
    );
    
    // Suscribirse al estado de apertura del chat
    this.subscriptions.add(
      this.chatService.isChatOpen$.subscribe(isOpen => {
        this.isChatOpen = isOpen;
        if (isOpen) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      })
    );
    
    // Suscribirse al estado de escritura
    this.subscriptions.add(
      this.chatService.typingStatus$.subscribe(status => {
        this.typingStatus = status;
      })
    );
    
    // Suscribirse al contador de mensajes no leídos
    this.subscriptions.add(
      this.chatService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );
    
    // Configurar detección de escritura
    this.setupTypingDetection();
    
    // Suscribirse al estado de pre-launch para deshabilitar chat cuando esté activo
    this.subscriptions.add(
      this.prelaunchConfigService.isPrelaunchEnabled$.subscribe(isPrelaunchEnabled => {
        this.isChatEnabled = !isPrelaunchEnabled;
        
        // Si el prelaunch se activa mientras el chat está abierto, cerrarlo
        if (isPrelaunchEnabled && this.isChatOpen) {
          this.closeChat();
        }
        
        this.cdr.detectChanges();
      })
    );
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  /**
   * Configura la detección de escritura para notificar al servidor
   */
  private setupTypingDetection(): void {
    // Cuando el usuario escribe en el campo de mensaje
    this.subscriptions.add(
      this.messageControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(value => {
        // Notificar al servidor si el usuario está escribiendo o no
        const isTyping = value && value.trim().length > 0;
        this.chatService.sendTypingStatus(isTyping);
      })
    );
  }
  
  /**
   * Abre el chat widget
   */
  openChat(): void {
    this.chatService.openChat();
  }
  
  /**
   * Cierra el chat widget
   */
  closeChat(): void {
    this.chatService.closeChat();
  }

  /**
   * Confirma el abandono de la conversación: cerrar sesión, limpiar estado local
   * y asegurarse de que el popup no reaparezca.
   */
  confirmAbandon(): void {
    // Close the confirmation UI first so it doesn't show when reopening
    this.showCloseConfirm = false;

    // End the chat session on the service (clears session, messages, socket)
    try {
      this.chatService.endChat();
    } catch (err) {
      console.error('Error ending chat session:', err);
    }

    // Clear local state to ensure UI is fresh when reopened
    this.messages = [];
    try { this.messageControl.reset(); } catch (e) {}
    // Force change detection to update template immediately
    try { this.cdr.detectChanges(); } catch (e) {}
  }
  
  /**
   * Envía un mensaje al chat
   */
  sendMessage(): void {
    if (this.messageControl.invalid || !this.messageControl.value.trim()) {
      return;
    }
    
    const message = this.messageControl.value.trim();
    this.chatService.sendMessage(message);
    
    // Limpiar el campo de mensaje
    this.messageControl.reset();
  }
  
  /**
   * Desplaza el contenedor de mensajes hacia abajo
   */
  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }
  
  /**
   * Inicializa un nuevo chat
   */
  initNewChat(): void {
    this.chatService.initChat().subscribe({
      next: () => this.openChat(),
      error: error => console.error('Error al iniciar chat:', error)
    });
  }
  
  /**
   * Finaliza la sesión de chat actual
   */
  endChat(): void {
    this.chatService.endChat();
  }
  
  /**
   * Verifica si un mensaje fue enviado por el usuario actual
   */
  isSentByMe(message: any): boolean {
    return message.sender_type === 'user';
  }
  
  /**
   * Verifica si un mensaje fue enviado por el sistema
   */
  isSystemMessage(message: any): boolean {
    return message.sender_type === 'system';
  }
  
  /**
   * Procesa la tecla Enter para enviar el mensaje
   */
  handleEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}