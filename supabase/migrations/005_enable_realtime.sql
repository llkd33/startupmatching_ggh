-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable real-time for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create function to send notification on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for the receiver
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.receiver_id,
    'message_received',
    '새 메시지',
    '새로운 메시지가 도착했습니다.',
    jsonb_build_object(
      'campaign_id', NEW.campaign_id,
      'sender_id', NEW.sender_id,
      'message_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new messages
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Create function to send notification on new proposal
CREATE OR REPLACE FUNCTION notify_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
  campaign_title TEXT;
  organization_user_id UUID;
BEGIN
  -- Get campaign details
  SELECT c.title, o.user_id
  INTO campaign_title, organization_user_id
  FROM public.campaigns c
  JOIN public.organization_profiles o ON c.organization_id = o.id
  WHERE c.id = NEW.campaign_id;
  
  -- Create notification for organization
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    organization_user_id,
    'proposal_received',
    '새 제안서',
    format('"%s" 캠페인에 새 제안서가 접수되었습니다.', campaign_title),
    jsonb_build_object(
      'campaign_id', NEW.campaign_id,
      'proposal_id', NEW.id,
      'expert_id', NEW.expert_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new proposals
CREATE TRIGGER on_new_proposal
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_proposal();

-- Create function to send notification on proposal status change
CREATE OR REPLACE FUNCTION notify_proposal_status_change()
RETURNS TRIGGER AS $$
DECLARE
  campaign_title TEXT;
  expert_user_id UUID;
  status_message TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get campaign and expert details
  SELECT c.title, ep.user_id
  INTO campaign_title, expert_user_id
  FROM public.campaigns c
  JOIN public.expert_profiles ep ON ep.id = NEW.expert_id
  WHERE c.id = NEW.campaign_id;
  
  -- Set status message
  CASE NEW.status
    WHEN 'accepted' THEN
      status_message := format('"%s" 캠페인 제안서가 승인되었습니다!', campaign_title);
    WHEN 'rejected' THEN
      status_message := format('"%s" 캠페인 제안서가 거절되었습니다.', campaign_title);
    WHEN 'under_review' THEN
      status_message := format('"%s" 캠페인 제안서가 검토 중입니다.', campaign_title);
    ELSE
      status_message := format('"%s" 캠페인 제안서 상태가 변경되었습니다.', campaign_title);
  END CASE;
  
  -- Create notification for expert
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    expert_user_id,
    'proposal_status',
    '제안서 상태 변경',
    status_message,
    jsonb_build_object(
      'campaign_id', NEW.campaign_id,
      'proposal_id', NEW.id,
      'status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for proposal status changes
CREATE TRIGGER on_proposal_status_change
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION notify_proposal_status_change();